import os
import sys
import json
import re
import io
import sqlite3
from datetime import datetime

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

import pytesseract
from PIL import Image

# Google API imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# --- Configuration ---
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

# Ensure TESSDATA_PREFIX is set to local tessdata directory if available
local_tessdata = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tessdata')
if os.path.exists(local_tessdata) and not os.environ.get('TESSDATA_PREFIX'):
    os.environ['TESSDATA_PREFIX'] = local_tessdata

def get_existing_db_dates():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prisma', 'dev.db')
    if not os.path.exists(db_path):
        return set(), set(), set()
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT date FROM SleepData")
        sleep_dates = {r[0] for r in cur.fetchall() if r[0]}
        cur.execute("SELECT date FROM ActivityData")
        walk_dates = {r[0] for r in cur.fetchall() if r[0]}
        cur.execute("SELECT DISTINCT date FROM HeartRateData")
        hr_dates = {r[0] for r in cur.fetchall() if r[0]}
        conn.close()
        return sleep_dates, walk_dates, hr_dates
    except Exception as e:
        print(f"[WARNING] Could not read existing dates from SQLite: {e}")
        return set(), set(), set()

def authenticate_drive():
    creds = None
    token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drive_token.json')
    creds_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credentials.json')

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

def get_drive_folder_id(service):
    folder_results = service.files().list(
        q=f"name = '{DRIVE_PARENT_FOLDER}' and mimeType = 'application/vnd.google-apps.folder'",
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    
    parent_id = folder_results['files'][0]['id'] if folder_results.get('files') else None
    
    query_sleep = f"name = '{DRIVE_SUBFOLDER}' and mimeType = 'application/vnd.google-apps.folder'"
    if parent_id:
        query_sleep += f" and '{parent_id}' in parents"
        
    sleep_folder_results = service.files().list(
        q=query_sleep,
        spaces='drive',
        fields="files(id, name)"
    ).execute()
    
    if sleep_folder_results.get('files'):
        return sleep_folder_results['files'][0]['id']
    return None

def parse_duration(text):
    if not text: return 0
    h_match = re.search(r'(\d+)H', text, re.IGNORECASE)
    m_match = re.search(r'(\d+)M', text, re.IGNORECASE)
    h = int(h_match.group(1)) if h_match else 0
    m = int(m_match.group(1)) if m_match else 0
    return h * 60 + m

def extract_ocr_date(text):
    if not text:
        return None
        
    # Month name format: e.g. "Sep.20,2026", "Sep 20, 2026", "Sep.8,2026", "20 Sep 2026"
    m_month = re.search(r'([A-Za-z]{3,9})\.?\s*(\d{1,2}),?\s*(\d{4})', text)
    if m_month:
        try:
            m_str = m_month.group(1)[:3].capitalize()
            d_str = m_month.group(2)
            y_str = m_month.group(3)
            dt = datetime.strptime(f"{m_str} {d_str} {y_str}", "%b %d %Y")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    # Standard YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (with optional spaces)
    m_std = re.search(r'(20\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})', text)
    if m_std:
        y, m, d = int(m_std.group(1)), int(m_std.group(2)), int(m_std.group(3))
        if 2000 <= y <= 2099 and 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # Try with OCR substitutions for digits: O/o -> 0, l/I/| -> 1
    sub = text.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1').replace('|', '1')
    m_sub = re.search(r'(20\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})', sub)
    if m_sub:
        y, m, d = int(m_sub.group(1)), int(m_sub.group(2)), int(m_sub.group(3))
        if 2000 <= y <= 2099 and 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    return None

def process_sleep(image_path, fallback_date=None):
    with Image.open(image_path) as img:
        text = pytesseract.image_to_string(img, lang='eng')
    print("--- RAW SLEEP OCR ---")
    print(text[:300])
    print("---------------------")
    
    clean_text = text.replace('O', '0').replace('o', '0').replace('é', '6').replace('>', '5')
    
    # Extract date directly from Picture OCR text
    ocr_date = extract_ocr_date(text) or extract_ocr_date(clean_text)
    date_str = ocr_date if ocr_date else fallback_date
    if ocr_date:
        print(f"[OCR] Sleep Picture OCR Date: {date_str}")
    elif fallback_date:
        print(f"[OCR] Sleep using companion picture date: {date_str}")
    else:
        print(f"[WARNING] Sleep date could not be determined from picture OCR!")
    
    time_range_match = re.search(r'(\d{2}:\d{2}[AP]M)\s*-\s*(\d{2}:\d{2}[AP]M)', clean_text, re.IGNORECASE)
    start_time = time_range_match.group(1) if time_range_match else None
    end_time = time_range_match.group(2) if time_range_match else None

    durations_matches = re.findall(r'(?:(\d+)H)?(?:(\d+)M)', clean_text, re.IGNORECASE)
    valid_durations = []
    for h, m in durations_matches:
        s = ""
        if h and int(h) > 0: 
            s += f"{int(h)}H"
        if m and int(m) > 0: 
            s += f"{int(m)}M"
        if s:
            valid_durations.append(s)
            
    # As per layout: [Total, REM, Light, Deep] -> actions.js expects: [Total, Deep, Light, REM]
    ordered_durations = ["0M", "0M", "0M", "0M"]
    if len(valid_durations) >= 4:
        ordered_durations[0] = valid_durations[0] # Total
        ordered_durations[1] = valid_durations[3] # Deep
        ordered_durations[2] = valid_durations[2] # Light
        ordered_durations[3] = valid_durations[1] # REM
    elif len(valid_durations) > 0:
        ordered_durations[0] = valid_durations[0]

    awake_times_match = re.search(r'Awake times[^\d]*(\d+)', clean_text, re.IGNORECASE)
    awake_times = int(awake_times_match.group(1)) if awake_times_match else None
    
    falling_sleep_match = re.search(r'Falling sleep[^\d]*(\d+)', clean_text, re.IGNORECASE)
    falling_sleep_mins = int(falling_sleep_match.group(1)) if falling_sleep_match else None
    
    efficiency_matches = re.findall(r'Sleep efficiency[^\d]*(\d+)', clean_text, re.IGNORECASE)
    sleep_efficiency = int(efficiency_matches[-1]) if efficiency_matches else None
    
    return {
        "date": date_str,
        "start_time": start_time,
        "end_time": end_time,
        "raw_durations_found": ordered_durations,
        "awake_times": awake_times,
        "falling_sleep_mins": falling_sleep_mins,
        "sleep_efficiency_value": sleep_efficiency
    }

def process_walk(image_path, fallback_date=None):
    with Image.open(image_path) as img:
        text = pytesseract.image_to_string(img, config='--psm 6')
        top_crop = img.crop((0, 0, img.width, min(1000, img.height)))
        top_text = pytesseract.image_to_string(top_crop)
    print("--- RAW WALK OCR ---")
    print(text[:300])
    print("--------------------")
    
    # Extract date directly from Picture OCR text
    ocr_date = extract_ocr_date(top_text) or extract_ocr_date(text)
    date_str = ocr_date if ocr_date else fallback_date
    if ocr_date:
        print(f"[OCR] Walk Picture OCR Date: {date_str}")
    elif fallback_date:
        print(f"[OCR] Walk using companion picture date: {date_str}")
    else:
        print(f"[WARNING] Walk date could not be determined from picture OCR!")
    
    def sanitize_num(s, is_float=False):
        if not s: return None
        s = s.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1').replace('|', '1').replace(')', '1').replace(']', '1').replace(',', '')
        if is_float:
            nums = re.findall(r'\d+\.\d+|\d+', s)
            return float(nums[0]) if nums else None
        else:
            nums = re.findall(r'\d+', s)
            return int(nums[0]) if nums else None

    summary_match = re.search(r'([A-Za-z0-9,)\|\]]+)\s+([A-Za-z0-9,.]+)\s*k\s*m\s+([A-Za-z0-9,]+)\s*k\s*c\s*a\s*l', text, re.IGNORECASE)
    
    if summary_match:
        steps = sanitize_num(summary_match.group(1))
        distance = sanitize_num(summary_match.group(2), is_float=True)
        calories = sanitize_num(summary_match.group(3))
    else:
        steps = None
        distance = None
        calories = None
        km_match = re.search(r'(\d+(?:\.\d+)?)\s*k\s*m', text, re.IGNORECASE)
        if km_match:
            distance = float(km_match.group(1))
        kcal_match = re.search(r'(\d+)\s*k\s*c\s*a\s*l', text, re.IGNORECASE)
        if kcal_match:
            calories = int(kcal_match.group(1))
    
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

def process_heart_rate(image_path, fallback_date=None):
    timeline = []
    ocr_date = None
    
    with Image.open(image_path) as img:
        width, height = img.size
        chunk_height = 2000
        
        for i in range(0, height, chunk_height):
            box = (0, i, width, min(i + chunk_height, height))
            chunk = img.crop(box)
            text = pytesseract.image_to_string(chunk, config='--psm 6')
            
            if not ocr_date:
                ocr_date = extract_ocr_date(text)
                
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
                
    date_str = ocr_date if ocr_date else fallback_date
    if ocr_date:
        print(f"[OCR] Heart Rate Picture OCR Date: {date_str}")
    elif fallback_date:
        print(f"[OCR] Heart Rate using companion picture date: {date_str}")
    else:
        print(f"[WARNING] Heart Rate date could not be determined!")

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
    force_all = "--force" in sys.argv or "--all" in sys.argv
    service = authenticate_drive()
    folder_id = get_drive_folder_id(service)
    
    sleep_dates, walk_dates, hr_dates = get_existing_db_dates()
    print(f"[DB] Existing DB records - Sleep: {len(sleep_dates)} dates, Walk: {len(walk_dates)} dates, HR: {len(hr_dates)} dates")

    query = "mimeType contains 'image/'"
    if folder_id:
        query += f" and '{folder_id}' in parents"
        
    results = service.files().list(
        q=query,
        orderBy="createdTime desc",
        pageSize=100,
        fields="files(id, name, createdTime, size)"
    ).execute()
    
    files = results.get('files', [])
    if not files:
        print("[INFO] No images found on Google Drive.")
        return

    KNOWN_FILE_OVERRIDES = {
        'share_20261002151501.jpeg': '2026-09-30'
    }

    def get_initial_file_date(f_item):
        name = f_item['name']
        if name in KNOWN_FILE_OVERRIDES:
            return KNOWN_FILE_OVERRIDES[name]
        m = re.search(r'share_(\d{4})(\d{2})(\d{2})', name)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        
        # Download and read Picture OCR date for non-share files (e.g. File_000.png, IMG_*.jpg)
        # NEVER use Google Drive upload timestamp (createdTime)!
        try:
            req = service.files().get_media(fileId=f_item['id'])
            fh = io.BytesIO()
            dl = MediaIoBaseDownload(fh, req)
            done = False
            while not done:
                _, done = dl.next_chunk()
            fh.seek(0)
            with Image.open(fh) as img:
                crop = img.crop((0, 0, img.width, min(1500, img.height)))
                txt = pytesseract.image_to_string(crop)
                pic_d = extract_ocr_date(txt)
                if pic_d:
                    print(f"[OCR] Determined picture date {pic_d} directly from image header for {name}")
                    return pic_d
        except Exception as e:
            print(f"[WARNING] Could not read header from {name}: {e}")
        return None

    # Group files by picture/capture date (NEVER by Google Drive upload timestamp)
    files_by_date = {}
    for f in files:
        d = get_initial_file_date(f)
        if d:
            files_by_date.setdefault(d, []).append(f)
        else:
            print(f"[WARNING] Skipping file {f['name']} - could not determine picture date (upload timestamp ignored)")

    all_dates = sorted(files_by_date.keys(), reverse=True)
    latest_date = all_dates[0] if all_dates else None

    # Determine which dates need syncing
    dates_to_sync = []
    for d in all_dates:
        needs_sync = (
            force_all or 
            (d == latest_date) or 
            (d not in sleep_dates) or 
            (d not in walk_dates) or 
            (d not in hr_dates)
        )
        if needs_sync:
            dates_to_sync.append(d)

    print(f"[DRIVE] Total dates found on Drive: {len(all_dates)}. Dates to sync ({len(dates_to_sync)}): {dates_to_sync}")

    new_sleep_records = []
    new_walk_records = []
    new_hr_records = []

    for target_date in dates_to_sync:
        date_files = files_by_date.get(target_date, [])
        print(f"\n[SYNC] === Processing Date: {target_date} ({len(date_files)} candidate images) ===")
        
        # Download images for this date
        downloaded = []
        for item in date_files:
            filename = item['name']
            print(f"[DRIVE] Downloading image: {filename}")
            req = service.files().get_media(fileId=item['id'])
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, req)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            fh.seek(0)
            
            image_path = os.path.join(os.path.dirname(__file__), filename)
            with open(image_path, 'wb') as f:
                f.write(fh.read())
            downloaded.append({"path": image_path, "filename": filename})

        # Categorize by height, picking the latest image for each category on this date
        categories = {}
        for f_info in downloaded:
            try:
                with Image.open(f_info["path"]) as img:
                    w, h = img.size
                if h < 4000:
                    cat = "sleep"
                elif h < 20000:
                    cat = "walk"
                else:
                    cat = "heart_rate"
                
                if cat not in categories:
                    categories[cat] = f_info["path"]
            except Exception as e:
                print(f"[WARNING] Could not open image {f_info['filename']}: {e}")

        print(f"[INFO] Categories identified for {target_date}: {list(categories.keys())}")

        companion_picture_date = target_date

        # Run OCR
        if "sleep" in categories:
            if force_all or target_date == latest_date or target_date not in sleep_dates:
                try:
                    res = process_sleep(categories["sleep"], fallback_date=companion_picture_date)
                    if res.get('date'):
                        companion_picture_date = res['date']
                        new_sleep_records.append(res)
                except Exception as e:
                    print(f"[ERROR] Sleep OCR failed for {target_date}: {e}")

        if "walk" in categories:
            if force_all or target_date == latest_date or target_date not in walk_dates:
                try:
                    res = process_walk(categories["walk"], fallback_date=companion_picture_date)
                    if res.get('date'):
                        companion_picture_date = res['date']
                        new_walk_records.append(res)
                except Exception as e:
                    print(f"[ERROR] Walk OCR failed for {target_date}: {e}")

        if "heart_rate" in categories:
            if force_all or target_date == latest_date or target_date not in hr_dates:
                try:
                    res = process_heart_rate(categories["heart_rate"], fallback_date=companion_picture_date)
                    if res.get('date'):
                        new_hr_records.append(res)
                except Exception as e:
                    print(f"[ERROR] HR OCR failed for {target_date}: {e}")

        # Clean up temporary images for this date
        for f_info in downloaded:
            try:
                if os.path.exists(f_info["path"]):
                    os.remove(f_info["path"])
            except Exception as e:
                print(f"[WARNING] Failed to delete {f_info['filename']}: {e}")

    # Merge results into health_ocr_sync_results.json
    out_path = os.path.join(os.path.dirname(__file__), 'health_ocr_sync_results.json')
    prev_results = {}
    if os.path.exists(out_path):
        try:
            with open(out_path, 'r', encoding='utf-8') as f:
                prev_results = json.load(f)
        except Exception:
            pass

    sleep_map = {r['date']: r for r in prev_results.get('sleep_records', []) if r.get('date')}
    if prev_results.get('sleep') and prev_results['sleep'].get('date'):
        sleep_map[prev_results['sleep']['date']] = prev_results['sleep']
        
    walk_map = {r['date']: r for r in prev_results.get('walk_records', []) if r.get('date')}
    if prev_results.get('walk') and prev_results['walk'].get('date'):
        walk_map[prev_results['walk']['date']] = prev_results['walk']
        
    hr_map = {r['date']: r for r in prev_results.get('heart_rate_records', []) if r.get('date')}
    if prev_results.get('heart_rate') and prev_results['heart_rate'].get('date'):
        hr_map[prev_results['heart_rate']['date']] = prev_results['heart_rate']

    for r in new_sleep_records:
        if r.get('date') and not r.get('error'):
            sleep_map[r['date']] = r
    for r in new_walk_records:
        if r.get('date') and not r.get('error'):
            walk_map[r['date']] = r
    for r in new_hr_records:
        if r.get('date') and not r.get('error'):
            hr_map[r['date']] = r

    all_sleep = sorted(sleep_map.values(), key=lambda x: x.get('date', ''), reverse=True)
    all_walk = sorted(walk_map.values(), key=lambda x: x.get('date', ''), reverse=True)
    all_hr = sorted(hr_map.values(), key=lambda x: x.get('date', ''), reverse=True)

    results = {
        "sleep_records": all_sleep,
        "walk_records": all_walk,
        "heart_rate_records": all_hr,
        "sleep": all_sleep[0] if all_sleep else None,
        "walk": all_walk[0] if all_walk else None,
        "heart_rate": all_hr[0] if all_hr else None
    }

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=4, ensure_ascii=False)

    print(f"\n[SUCCESS] Pipeline complete. Saved {len(all_sleep)} sleep, {len(all_walk)} walk, {len(all_hr)} HR records to {out_path}")

if __name__ == '__main__':
    main()
