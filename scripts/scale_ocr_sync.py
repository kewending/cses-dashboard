"""
CSES Scale OCR Sync Script
Downloads images from 'Personal Data' Google Drive folder,
extracts data (Weight, BMI/Fat, BMR, Bone Mass) via Tesseract OCR,
deduces measurement date from INSIDE the image, checks for duplicates against DB and JSON,
and updates physical_data.json & Daily Log.
"""

import os
import io
import sys
import json
import re
import sqlite3
from datetime import datetime
import traceback

def ensure_dependencies():
    packages = {
        "googleapiclient": "google-api-python-client",
        "google_auth_oauthlib": "google-auth-oauthlib",
        "google_auth_httplib2": "google-auth-httplib2",
        "pytesseract": "pytesseract",
        "PIL": "Pillow"
    }
    for mod, pkg in packages.items():
        try:
            __import__(mod)
        except ImportError:
            print(f"[SETUP] Installing {pkg}...")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

ensure_dependencies()

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pytesseract
from PIL import Image

# --- Configuration ---
DRIVE_PARENT_FOLDER = 'Personal Data'
DRIVE_SUBFOLDER = 'Weight'

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Programs\Tesseract-OCR\tesseract.exe')
]

tesseract_found = False
for path in TESSERACT_PATHS:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        tesseract_found = True
        break

if not tesseract_found:
    print(f"[ERROR] Tesseract-OCR 未找到。")
    sys.exit(1)

# Ensure TESSDATA_PREFIX is set
local_tessdata = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tessdata')
if os.path.exists(local_tessdata) and not os.environ.get('TESSDATA_PREFIX'):
    os.environ['TESSDATA_PREFIX'] = local_tessdata

def authenticate_drive():
    creds = None
    token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drive_token.json')
    creds_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credentials.json')

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                print(f"[ERROR] 缺失 {creds_path}")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return build('drive', 'v3', credentials=creds)

def get_existing_scale_dates():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prisma', 'dev.db')
    if not os.path.exists(db_path):
        return set()
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT date FROM PhysicalData")
        dates = {r[0] for r in cur.fetchall() if r[0]}
        conn.close()
        return dates
    except Exception as e:
        print(f"[WARNING] Could not read PhysicalData dates from DB: {e}")
        return set()

def get_weight_folder_id(service):
    folder_results = service.files().list(
        q=f"name = '{DRIVE_PARENT_FOLDER}' and mimeType = 'application/vnd.google-apps.folder'",
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    parent_id = folder_results['files'][0]['id'] if folder_results.get('files') else None
    
    query = f"name = '{DRIVE_SUBFOLDER}' and mimeType = 'application/vnd.google-apps.folder'"
    if parent_id:
        query += f" and '{parent_id}' in parents"
        
    sub_results = service.files().list(q=query, spaces='drive', fields="files(id, name)").execute()
    return sub_results['files'][0]['id'] if sub_results.get('files') else None

def extract_data_from_image(image_path):
    print(f"[OCR] Running Tesseract OCR on {image_path}...")
    img = Image.open(image_path)
    img = img.convert('L')
    
    # Use PSM 6 (Assume a single uniform block of text) to read horizontally
    raw_text = pytesseract.image_to_string(img, config='--psm 6')
    text = raw_text
    
    data = {}
    
    patterns = {
        'weight_kg': r'(?i)Weight\s+(\d{2,3}\.\d+)kg',
        'bmi': r'(?i)BMI\s+(\d{1,2}\.\d+)',
        'body_fat_pct': r'(?i)Body Fat(?: rate)?\s+(\d{1,2}\.\d+)%',
        'fat_mass_kg': r'(?i)Fat Mass\s+(\d{1,3}\.\d+)kg',
        'fat_free_body_weight_kg': r'(?i)Fat-free Body Weight\s+(\d{2,3}\.\d+)kg',
        'muscle_mass_kg': r'(?i)Muscle Mass\s+(\d{2,3}\.\d+)kg',
        'muscle_rate_pct': r'(?i)Muscle Rate\s+(\d{2,3}\.\d+)%',
        'skeletal_muscle_pct': r'(?i)Skeletal Muscle(?: rate)?\s+(\d{1,3}\.\d+)%',
        'bone_mass_kg': r'(?i)Bone Mass\s+(\d{1,2}\.\d+)kg',
        'protein_mass_kg': r'(?i)Protein Mass\s+(\d{1,3}\.\d+)kg',
        'protein_pct': r'(?i)Protein\s+(\d{1,3}\.\d+)%',
        'water_weight_kg': r'(?i)Water (?:Weight|content)\s+(\d{2,3}\.\d+)kg',
        'body_water_pct': r'(?i)Body Water\s+(\d{1,3}\.\d+)%',
        'subcutaneous_fat_pct': r'(?i)Subcutaneous fat\s+(\d{1,3}\.\d+)%',
        'visceral_fat': r'(?i)Visceral Fat\s+(\d{1,2}\.\d+)',
        'bmr_kcal': r'(?i)BMR\s+(\d{3,4})kca[il]',
        'body_age': r'(?i)Body age\s+(\d{1,3})',
        'ideal_body_weight_kg': r'(?i)(?:Ideal|Standard) body weight\s+(\d{2,3}\.\d+)kg'
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            data[key] = float(match.group(1))

    # Fallbacks
    if 'weight_kg' not in data:
        kg_matches = re.findall(r'(\d{1,3}\.\d+)\s*kg', text)
        for match in kg_matches:
            val = float(match)
            if 30 < val < 150:
                data['weight_kg'] = val
            elif val < 10 and 'bone_mass_kg' not in data:
                data['bone_mass_kg'] = val

    print(f"[OCR] Extracted Data: {data}")
    return data, raw_text

def parse_date_from_text(text, filename=None):
    if not text:
        return None, None
        
    # Match time + month name format: "21:30 Sep.20,2026" or "21:30 Sep 20, 2026" or "21:30 Sep.8,2026"
    match_time_month = re.search(r'(\d{1,2}:\d{2})\s+([A-Za-z]{3,9})\.?\s*(\d{1,2}),?\s*(\d{4})', text, re.IGNORECASE)
    if match_time_month:
        try:
            time_part = match_time_month.group(1)
            if len(time_part.split(':')[0]) == 1:
                time_part = f"0{time_part}"
            m_str = match_time_month.group(2)[:3].capitalize()
            d_str = match_time_month.group(3)
            y_str = match_time_month.group(4)
            parsed_date = datetime.strptime(f"{m_str} {d_str} {y_str}", "%b %d %Y")
            return parsed_date.strftime("%Y-%m-%d"), f"{time_part}:00"
        except Exception:
            pass

    # Match month name without time: e.g. "Sep.20,2026"
    match_month = re.search(r'([A-Za-z]{3,9})\.?\s*(\d{1,2}),?\s*(\d{4})', text, re.IGNORECASE)
    if match_month:
        try:
            m_str = match_month.group(1)[:3].capitalize()
            d_str = match_month.group(2)
            y_str = match_month.group(3)
            parsed_date = datetime.strptime(f"{m_str} {d_str} {y_str}", "%b %d %Y")
            return parsed_date.strftime("%Y-%m-%d"), "00:00:00"
        except Exception:
            pass

    # Match time + YYYY/MM/DD or YYYY-MM-DD
    match_time_iso = re.search(r'(\d{1,2}:\d{2})\s+(20\d{2}[/-]\d{1,2}[/-]\d{1,2})', text)
    if match_time_iso:
        time_part = match_time_iso.group(1)
        if len(time_part.split(':')[0]) == 1:
            time_part = f"0{time_part}"
        parts = [int(p) for p in re.split(r'[-/]', match_time_iso.group(2))]
        return f"{parts[0]:04d}-{parts[1]:02d}-{parts[2]:02d}", f"{time_part}:00"

    # Match YYYY/MM/DD or YYYY-MM-DD alone
    match_iso = re.search(r'(20\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})', text)
    if match_iso:
        y, m, d = int(match_iso.group(1)), int(match_iso.group(2)), int(match_iso.group(3))
        if 2000 <= y <= 2099 and 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}", "00:00:00"

    print(f"[WARNING] Could not parse measurement date from Picture OCR text. Ignoring upload timestamp.")
    return None, None

def save_to_physical_data_json(date_str, time_str, data):
    if not data:
        return False
    output_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(output_dir, 'physical_data.json')
    
    db = {"records": []}
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                db = json.load(f)
            except Exception:
                pass
                
    timestamp = f"{date_str}T{time_str}"
    record = {
        "date": date_str,
        "time": time_str,
        "data": data,
        "timestamp": timestamp
    }
    
    found = False
    for i, r in enumerate(db.get("records", [])):
        if r.get("date") == date_str or r.get("timestamp") == timestamp:
            db["records"][i] = record
            found = True
            break
            
    if not found:
        db.setdefault("records", []).append(record)
    
    db["records"].sort(key=lambda r: r.get("date", ""))
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    print(f"[SUCCESS] Saved scale data for {date_str} to physical_data.json")
    return True

def update_daily_log(date_str, data):
    if not data or 'weight_kg' not in data:
        return
        
    weight = data['weight_kg']
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'LOGS', date_str[:7])
    log_path = os.path.join(log_dir, f"{date_str}.md")
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
        
    if not os.path.exists(log_path):
        template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'LOGS', 'templates', 'daily_log_template.md')
        if os.path.exists(template_path):
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            content = content.replace('{{YYYY-MM-DD}}', date_str)
            with open(log_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[INFO] Created new daily log for {date_str}.")
        else:
            return
            
    with open(log_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = re.sub(r'weight:\s*0(\.0)?', f'weight: {weight}', content, count=1)
    
    if content != new_content:
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[SUCCESS] Updated {date_str}.md with weight: {weight} kg")

def main():
    service = authenticate_drive()
    folder_id = get_weight_folder_id(service)
    
    query = "mimeType contains 'image/'"
    if folder_id:
        query += f" and '{folder_id}' in parents"
        
    results = service.files().list(
        q=query,
        orderBy="createdTime desc",
        pageSize=20,
        fields="files(id, name, createdTime)"
    ).execute()
    
    items = results.get('files', [])
    if not items:
        print("[INFO] No scale images found.")
        return

    db_dates = get_existing_scale_dates()
    print(f"[DB] Found {len(db_dates)} existing PhysicalData dates in DB: {sorted(db_dates)}")

    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'physical_data.json')
    json_dates = set()
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                json_dates = {r.get('date') for r in content.get('records', []) if r.get('date')}
        except Exception:
            pass

    for idx, item in enumerate(items):
        filename = item['name']
        print(f"\n[SCALE] Evaluating {filename} ({item['createdTime']})...")
        
        request = service.files().get_media(fileId=item['id'])
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        
        fh.seek(0)
        temp_img_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"temp_{filename}")
        with open(temp_img_path, 'wb') as f:
            f.write(fh.read())
            
        try:
            data, raw_text = extract_data_from_image(temp_img_path)
            date_str, time_str = parse_date_from_text(raw_text, filename)
            if not date_str:
                print(f"[WARNING] Skipping {filename}: No valid measurement date found in picture OCR.")
                continue
            print(f"[INFO] Measurement date parsed from Picture OCR: {date_str} {time_str}")
            
            if idx == 0 or date_str not in db_dates or date_str not in json_dates:
                save_to_physical_data_json(date_str, time_str, data)
                update_daily_log(date_str, data)
            else:
                print(f"[INFO] Scale data for {date_str} already exists in DB and JSON.")
        finally:
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)

if __name__ == '__main__':
    main()
