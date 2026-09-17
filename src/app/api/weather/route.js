import { NextResponse } from 'next/server';

// TODO: In the future, fetch lat/lon from Global Settings based on user ID
const DEFAULT_LAT = -37.625;
const DEFAULT_LON = 143.875;

const weatherCodes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 61: "Slight rain", 
    63: "Moderate rain", 65: "Heavy rain", 95: "Thunderstorm"
};

export async function GET(request) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const daily = data.daily;
    
    if (!daily) {
      throw new Error('No daily data returned from Open-Meteo');
    }

    const weatherContext = {
      weather: weatherCodes[daily.weather_code[0]] || "Unknown",
      high: daily.temperature_2m_max[0],
      low: daily.temperature_2m_min[0],
      sunrise: daily.sunrise[0].split("T")[1],
      sunset: daily.sunset[0].split("T")[1],
    };

    return NextResponse.json(weatherContext);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
