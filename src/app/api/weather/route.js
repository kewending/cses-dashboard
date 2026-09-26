import { NextResponse } from 'next/server';

// TODO: In the future, fetch lat/lon from Global Settings based on user ID
const DEFAULT_LAT = -37.625;
const DEFAULT_LON = 143.875;

const weatherCodes = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Light freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Heavy freezing rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail"
};

const weatherIcons = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌧️", 55: "🌧️",
  56: "🌧️❄️", 57: "🌧️❄️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  66: "🌧️❄️", 67: "🌧️❄️",
  71: "🌨️", 73: "🌨️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  85: "🌨️", 86: "❄️",
  95: "⛈️", 96: "⛈️❄️", 99: "⛈️❄️"
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
      icon: weatherIcons[daily.weather_code[0]] || "❓",
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
