import os
import sys
import json
import re
import io
from datetime import datetime
import pytesseract
from PIL import Image

# Google API imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# --- Configuration ---
# Specify the Google Drive folder names where your health screenshots are uploaded.
DRIVE_PARENT_FOLDER = 'Personal Data'
DRIVE_SUBFOLDER = 'Sleep'

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Setup encoding for windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Initialize Tesseract
tesseract_found = False
paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe', 
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Programs\Tesseract-OCR\tesseract.exe')
]
for path in paths:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        tesseract_found = True
        break

if not tesseract_found:
    print("[ERROR] Tesseract-OCR not found.")
    sys.exit(1)

from google.auth.exceptions import RefreshError

def authenticate_drive():
    creds = None
    token_path = os.path.join(os.path.dirname(__file__), 'drive_token.json')
    creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except RefreshError:
                print("[WARNING] Refresh token expired. Removing drive_token.json and re-authenticating.")
                os.remove(token_path)
                creds = None
        
        if not creds:
            if not os.path.exists(creds_path):
                print(f"[ERROR] Missing {creds_path}")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
            
    return build('drive', 'v3', credentials=creds)

def download_health_images(service):
    # 1. Find the parent folder
    folder_results = service.files().list(
        q=f"name = '{DRIVE_PARENT_FOLDER}' and mimeType = 'application/vnd.google-apps.folder'",
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    
    parent_id = None
    if folder_results.get('files'):
        parent_id = folder_results['files'][0]['id']
        print(f"[DRIVE] Found '{DRIVE_PARENT_FOLDER}' folder.")
    
    # 2. Find the subfolder inside parent
    query_sleep = f"name = '{DRIVE_SUBFOLDER}' and mimeType = 'application/vnd.google-apps.folder'"
    if parent_id:
        query_sleep += f" and '{parent_id}' in parents"
        
    sleep_folder_results = service.files().list(
        q=query_sleep,
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    
    folder_id = None
    if sleep_folder_results.get('files'):
        folder_id = sleep_folder_results['files'][0]['id']
        print(f"[DRIVE] Found '{DRIVE_SUBFOLDER}' subfolder.")
    else:
        print(f"[WARNING] '{DRIVE_SUBFOLDER}' folder not found. Searching globally.")
        
    # 3. Get latest 3 images (share_*.jpeg)
    query = "mimeType contains 'image/' and name contains 'share_'"
    if folder_id:
        query += f" and '{folder_id}' in parents"
        
    results = service.files().list(
        q=query,
        orderBy="createdTime desc",
        pageSize=10,
        fields="files(id, name, createdTime, size)"
    ).execute()
    
    items = results.get('files', [])
    if not items:
        print(f"[INFO] No images found.")
            
    downloaded_files = []
    
    for item in items:
        filename = item['name']
        print(f"[DRIVE] Downloading image: {filename} ({item['createdTime']})")
        request = service.files().get_media(fileId=item['id'])
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        image_path = os.path.join(os.path.dirname(__file__), filename)
        with open(image_path, 'wb') as f:
            f.write(fh.read())
            
        file_size = os.path.getsize(image_path)
        downloaded_files.append({
            "path": image_path,
            "filename": filename,
            "size": file_size
        })
        
    return downloaded_files

def identify_images(files):
    categories = {}
    for f in files:
        img = Image.open(f["path"])
        width, height = img.size
        print(f"[INFO] Evaluating {f['filename']} (Size: {width}x{height})")
        
        # Categorize by height since scrolling screenshots have drastically different heights
        if height < 4000:
            if "sleep" not in categories: # Keep latest if multiple
                categories["sleep"] = f["path"]
        elif height < 20000:
            if "walk" not in categories:
                categories["walk"] = f["path"]
        else:
            if "heart_rate" not in categories:
                categories["heart_rate"] = f["path"]
                
    print("[INFO] Identified Categories:")
    for cat, path in categories.items():
        print(f"  {cat}: {os.path.basename(path)}")
        
    return categories

def parse_duration(text):
    if not text: return 0
    h_match = re.search(r'(\d+)H', text, re.IGNORECASE)
    m_match = re.search(r'(\d+)M', text, re.IGNORECASE)
    h = int(h_match.group(1)) if h_match else 0
    m = int(m_match.group(1)) if m_match else 0
    return h * 60 + m

def process_sleep(image_path):
    text = pytesseract.image_to_string(Image.open(image_path), lang='eng')
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
    date_str = date_match.group(1) if date_match else None
    
    time_range_match = re.search(r'(\d{2}:\d{2}[AP]M)\s*-\s*(\d{2}:\d{2}[AP]M)', text, re.IGNORECASE)
    start_time = time_range_match.group(1) if time_range_match else None
    end_time = time_range_match.group(2) if time_range_match else None

    durations = re.findall(r'(?:(\d+)H)?(?:(\d+)M)', text, re.IGNORECASE)
    duration_strs = []
    for h, m in durations:
        s = ""
        if h: s += f"{h}H"
        if m: s += f"{m}M"
        if s: duration_strs.append(s)
        
    def parse_ocr_num(s):
        if not s: return None
        s = s.replace('O', '0').replace('o', '0').replace('>', '5')
        nums = re.findall(r'\d+', s)
        return int(nums[0]) if nums else None

    awake_times_match = re.search(r'Awake times(.*?)(?:times|minutes|$)', text, re.IGNORECASE | re.DOTALL)
    awake_times = parse_ocr_num(awake_times_match.group(1)) if awake_times_match else None
    
    falling_sleep_match = re.search(r'Falling sleep(.*?)(?:minutes)', text, re.IGNORECASE | re.DOTALL)
    falling_sleep_mins = parse_ocr_num(falling_sleep_match.group(1)) if falling_sleep_match else None
    
    efficiency_match = re.search(r'Sleep efficiency(.*?)(?:minutes|%|$)', text, re.IGNORECASE | re.DOTALL)
    sleep_efficiency = parse_ocr_num(efficiency_match.group(1)) if efficiency_match else None
    
    return {
        "date": date_str,
        "start_time": start_time,
        "end_time": end_time,
        "raw_durations_found": duration_strs,
        "awake_times": awake_times,
        "falling_sleep_mins": falling_sleep_mins,
        "sleep_efficiency_value": sleep_efficiency
    }

def process_walk(image_path):
    text = pytesseract.image_to_string(Image.open(image_path), config='--psm 6')
    print("--- RAW WALK OCR ---")
    print(text[:300]) # Print first 300 chars to see what OCR captured
    print("--------------------")
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
    date_str = date_match.group(1) if date_match else None
    
    def sanitize_num(s, is_float=False):
        if not s: return None
        s = s.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1').replace(',', '')
        if is_float:
            nums = re.findall(r'\d+\.\d+|\d+', s)
            return float(nums[0]) if nums else None
        else:
            nums = re.findall(r'\d+', s)
            return int(nums[0]) if nums else None

    summary_match = re.search(r'([A-Za-z0-9,]+)\s+([A-Za-z0-9,.]+)\s*Km\s+([A-Za-z0-9,]+)\s*Kcal', text, re.IGNORECASE)
    
    if summary_match:
        steps = sanitize_num(summary_match.group(1))
        distance = sanitize_num(summary_match.group(2), is_float=True)
        calories = sanitize_num(summary_match.group(3))
    else:
        steps = None
        distance = None
        calories = None
    
    timeline_matches = re.findall(r'(\d{2}:\d{2}[AP]M)[^\d]*(\d+)', text, re.IGNORECASE)
    timeline = []
    for time_str, step_str in timeline_matches:
        timeline.append({"time": time_str, "steps": int(step_str)})
        
    return {
        "date": date_str,
        "total_steps": steps,
        "distance_km": distance,
        "calories_kcal": calories,
        "timeline_samples": len(timeline),
        "timeline": timeline
    }

def process_heart_rate(image_path):
    img = Image.open(image_path)
    width, height = img.size
    
    chunk_height = 2000
    timeline = []
    date_str = None
    
    for i in range(0, height, chunk_height):
        box = (0, i, width, min(i + chunk_height, height))
        chunk = img.crop(box)
        text = pytesseract.image_to_string(chunk, config='--psm 6')
        
        if not date_str:
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', text)
            if date_match:
                date_str = date_match.group(1)
            
        matches = re.findall(r'(\d{2}:\d{2}(?:[AP]M)?)\s*.*?([\d/]+)', text, re.IGNORECASE)
        for t_str, vals_str in matches:
            bpm_vals = []
            for v in vals_str.split('/'):
                if v.isdigit():
                    bpm = int(v)
                    if 30 <= bpm <= 220:
                        bpm_vals.append(bpm)
            
            if bpm_vals:
                timeline.append({"time": t_str, "bpms": bpm_vals})
                
    unique_timeline = []
    seen = set()
    for item in timeline:
        key = f"{item['time']}_{item['bpms'][0] if item['bpms'] else ''}"
        if key not in seen:
            seen.add(key)
            unique_timeline.append(item)
            
    return {
        "date": date_str,
        "timeline_samples": len(unique_timeline),
        "timeline": unique_timeline
    }

def main():
    service = authenticate_drive()
    files = download_health_images(service)
    if not files:
        print("[ERROR] Failed to download images.")
        return
        
    images = identify_images(files)
    
    results = {}
    if "sleep" in images:
        try:
            results["sleep"] = process_sleep(images["sleep"])
        except Exception as e:
            results["sleep"] = {"error": str(e)}
            
    if "walk" in images:
        try:
            results["walk"] = process_walk(images["walk"])
        except Exception as e:
            results["walk"] = {"error": str(e)}
            
    if "heart_rate" in images:
        try:
            results["heart_rate"] = process_heart_rate(images["heart_rate"])
        except Exception as e:
            results["heart_rate"] = {"error": str(e)}
            
    out_path = os.path.join(os.path.dirname(__file__), 'health_ocr_sync_results.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=4, ensure_ascii=False)
        
    # Clean up downloaded images to save space
    print("\n[INFO] Cleaning up downloaded images...")
    for file_info in files:
        try:
            if os.path.exists(file_info["path"]):
                os.remove(file_info["path"])
                print(f"  Deleted {file_info['filename']}")
        except Exception as e:
            print(f"  [WARNING] Failed to delete {file_info['filename']}: {e}")
            
    print(f"\n[SUCCESS] Pipeline complete. Results saved to {out_path}")

if __name__ == '__main__':
    main()
