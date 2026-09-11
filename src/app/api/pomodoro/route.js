import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), '../PROTOCOLS/pomodoro_data.json');

export async function POST(request) {
  try {
    const data = await request.json();
    
    let db = { sessions: [] };
    if (fs.existsSync(DATA_FILE_PATH)) {
      const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      if (fileContent) {
          db = JSON.parse(fileContent);
      }
    } else {
        const dir = path.dirname(DATA_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    db.sessions.push({
      ...data,
      id: Date.now().toString()
    });
    
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(db, null, 4));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
