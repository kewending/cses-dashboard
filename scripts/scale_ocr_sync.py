"""
CSES Scale OCR Sync Script
Downloads the latest image from 'Personal Data' Google Drive folder,
extracts data (Weight, BMI/Fat, BMR, Bone Mass) via Tesseract OCR,
deduces measurement date from INSIDE the image, checks for duplicates, 
and updates physical_data.json & Daily Log.
"""

import os
import io
import sys
import json
import re
from datetime import datetime
import traceback
from PIL import Image
import pytesseract


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
import io
import pytesseract
from PIL import Image

# --- Configuration ---
# Specify the Google Drive folder names where your scale screenshots are uploaded.
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

def authenticate_drive():
    creds = None
    token_path = os.path.join(os.path.dirname(__file__), 'drive_token.json')
    creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')

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

def download_latest_image(service):
    # 1. Find the parent folder
    folder_results = service.files().list(
        q=f"name = '{DRIVE_PARENT_FOLDER}' and mimeType = 'application/vnd.google-apps.folder'",
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    
    query = "mimeType contains 'image/'"
    if folder_results.get('files'):
        parent_id = folder_results['files'][0]['id']
        print(f"[DRIVE] Found '{DRIVE_PARENT_FOLDER}' folder.")
        
        subfolder_results = service.files().list(
            q=f"'{parent_id}' in parents and name = '{DRIVE_SUBFOLDER}' and mimeType = 'application/vnd.google-apps.folder'",
            spaces='drive',
            fields="files(id, name)"
        ).execute()
        
        if subfolder_results.get('files'):
            folder_id = subfolder_results['files'][0]['id']
            query = f"'{folder_id}' in parents and mimeType contains 'image/'"
            print(f"[DRIVE] Found '{DRIVE_SUBFOLDER}' subfolder.")
        else:
            query = f"'{parent_id}' in parents and mimeType contains 'image/'"
            print(f"[WARNING] '{DRIVE_SUBFOLDER}' subfolder not found. Searching '{DRIVE_PARENT_FOLDER}' folder.")
    else:
        print(f"[WARNING] '{DRIVE_PARENT_FOLDER}' folder not found. Searching all images globally.")

    # 2. Get latest image in that folder
    results = service.files().list(
        q=query,
        orderBy="createdTime desc",
        pageSize=1,
        fields="files(id, name, createdTime)"
    ).execute()
    
    items = results.get('files', [])
    if not items:
        print("[INFO] No images found.")
        return None, None
        
    latest_file = items[0]
    filename = latest_file['name']
    print(f"[DRIVE] Found latest image: {filename} ({latest_file['createdTime']})")
    
    request = service.files().get_media(fileId=latest_file['id'])
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    
    fh.seek(0)
    image_path = os.path.join(os.path.dirname(__file__), 'latest_scale.jpg')
    with open(image_path, 'wb') as f:
        f.write(fh.read())
        
    return image_path, filename

def extract_data_from_image(image_path):
    print(f"[OCR] Running Tesseract OCR on {image_path}...")
    img = Image.open(image_path)
    img = img.convert('L')
    
    # Use PSM 6 (Assume a single uniform block of text) to read horizontally
    raw_text = pytesseract.image_to_string(img, config='--psm 6')
    text = raw_text
    
    data = {}
    
    # 1. Precise English label extraction
    patterns = {
        'weight_kg': r'(?i)Weight\s+(\d{2,3}\.\d+)kg',
        'bmi': r'(?i)BMI\s+(\d{1,2}\.\d+)',
        'body_fat_pct': r'(?i)Body Fat\s+(\d{1,2}\.\d+)%',
        'fat_mass_kg': r'(?i)Fat Mass\s+(\d{1,3}\.\d+)kg',
        'fat_free_body_weight_kg': r'(?i)Fat-free Body Weight\s+(\d{2,3}\.\d+)kg',
        'muscle_mass_kg': r'(?i)Muscle Mass\s+(\d{2,3}\.\d+)kg',
        'muscle_rate_pct': r'(?i)Muscle Rate\s+(\d{2,3}\.\d+)%',
        'skeletal_muscle_pct': r'(?i)Skeletal Muscle\s+(\d{1,3}\.\d+)%',
        'bone_mass_kg': r'(?i)Bone Mass\s+(\d{1,2}\.\d+)kg',
        'protein_mass_kg': r'(?i)Protein Mass\s+(\d{1,3}\.\d+)kg',
        'protein_pct': r'(?i)Protein\s+(\d{1,3}\.\d+)%',
        'water_weight_kg': r'(?i)Water Weight\s+(\d{2,3}\.\d+)kg',
        'body_water_pct': r'(?i)Body Water\s+(\d{1,3}\.\d+)%',
        'subcutaneous_fat_pct': r'(?i)Subcutaneous fat\s+(\d{1,3}\.\d+)%',
        'visceral_fat': r'(?i)Visceral Fat\s+(\d{1,2}\.\d+)',
        'bmr_kcal': r'(?i)BMR\s+(\d{3,4})kca[il]',
        'body_age': r'(?i)Body age\s+(\d{1,3})',
        'ideal_body_weight_kg': r'(?i)Ideal body weight\s+(\d{2,3}\.\d+)kg'
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            data[key] = float(match.group(1))

    # 2. Fallbacks (in case labels are missing or in Chinese)
    if 'weight_kg' not in data:
        kg_matches = re.findall(r'(\d{1,3}\.\d+)\s*kg', text)
        for match in kg_matches:
            val = float(match)
            # Only pick typical weights, avoid bone mass (<10) or ideal weight
            if 30 < val < 150:
                data['weight_kg'] = val
            elif val < 10 and 'bone_mass_kg' not in data:
                data['bone_mass_kg'] = val
                
    if 'bmi' not in data:
        combo_matches = re.search(r'(\d{2,3}\.\d+)\s*kg\s*(\d{1,2}\.\d+)', text)
        if combo_matches:
            data['bmi'] = float(combo_matches.group(2))
            
    print(f"[OCR] Extracted Data: {data}")
    return data, raw_text

def parse_date_from_filename(filename):
    # Match Unix timestamp in milliseconds (e.g. 1789732638195.jpg)
    unix_match = re.search(r'(\d{13})', filename)
    if unix_match:
        ts = int(unix_match.group(1)) / 1000.0
        dt = datetime.fromtimestamp(ts)
        return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M:%S")

    # Match old format Fitdays_YYYYMMDD-HHMMSS
    match = re.search(r'(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})', filename)
    if match:
        date_str = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
        time_str = f"{match.group(4)}:{match.group(5)}:{match.group(6)}"
        return date_str, time_str
    
    return datetime.now().strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M:%S")

def parse_date_from_text(text, filename):
    # Try format: 23:47 Sep.8,2026
    match2 = re.search(r'(\d{2}:\d{2})\s+([A-Za-z]{3})\.(\d{1,2}),(\d{4})', text, re.IGNORECASE)
    if match2:
        try:
            time_part = match2.group(1)
            month_str = match2.group(2)[:3].capitalize()
            day_str = match2.group(3)
            year_str = match2.group(4)
            parsed_date = datetime.strptime(f"{month_str}.{day_str},{year_str}", "%b.%d,%Y")
            return parsed_date.strftime("%Y-%m-%d"), f"{time_part}:00"
        except Exception as e:
            pass

    # Try format: 23:47 2026/09/08
    match1 = re.search(r'(\d{2}:\d{2})\s+(\d{4}[/-]\d{1,2}[/-]\d{1,2})', text)
    if match1:
        time_str = match1.group(1) + ":00"
        date_str = match1.group(2).replace('/', '-')
        return date_str, time_str

    print(f"[WARNING] Could not parse measurement date from OCR text. Falling back to filename.")
    return parse_date_from_filename(filename)

def save_to_physical_data_json(date_str, time_str, data):
    if not data:
        return False
    output_dir = os.path.dirname(__file__)
    json_path = os.path.join(output_dir, 'physical_data.json')
    
    db = {"records": []}
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                db = json.load(f)
            except json.JSONDecodeError:
                pass
                
    timestamp = f"{date_str}T{time_str}"
    
    record = {
        "date": date_str,
        "time": time_str,
        "data": data,
        "timestamp": timestamp
    }
    db["records"].append(record)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4)
    print(f"[SUCCESS] Appended raw data to physical_data.json")
    return True

def update_daily_log(date_str, data):
    if not data or 'weight_kg' not in data:
        return
        
    weight = data['weight_kg']
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'LOGS', date_str[:7])
    log_path = os.path.join(log_dir, f"{date_str}.md")
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
        
    if not os.path.exists(log_path):
        template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'LOGS', 'templates', 'daily_log_template.md')
        if os.path.exists(template_path):
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()
            content = content.replace('{{YYYY-MM-DD}}', date_str)
            with open(log_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[INFO] Created new daily log for {date_str}.")
        else:
            print(f"[ERROR] Daily log {log_path} does not exist and template not found.")
            return
            
    with open(log_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = re.sub(r'weight:\s*0(\.0)?', f'weight: {weight}', content, count=1)
    
    if content != new_content:
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[SUCCESS] Updated {date_str}.md with weight: {weight} kg")
    else:
        print(f"[INFO] Weight already updated or not found in {date_str}.md.")

def main():
    service = authenticate_drive()
    image_path, filename = download_latest_image(service)
    
    if not image_path or not filename:
        return

    # Must run OCR first to extract the ACTUAL measurement date from inside the image
    data, raw_text = extract_data_from_image(image_path)
    date_str, time_str = parse_date_from_text(raw_text, filename)
    timestamp = f"{date_str}T{time_str}"
    
    print(f"[INFO] Measurement timestamp parsed as: {timestamp}")
    
    # Check for duplicates AFTER OCR (because we need the real time from OCR text)
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'PROTOCOLS', 'physical_data.json')
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                db = json.load(f)
                for r in db.get("records", []):
                    if r.get("timestamp") == timestamp:
                        print(f"[INFO] Image data for {timestamp} already exists in database. Skipping duplicate save.")
                        return
            except Exception:
                pass
                
    saved = save_to_physical_data_json(date_str, time_str, data)
    if saved:
        update_daily_log(date_str, data)

if __name__ == '__main__':
    main()
