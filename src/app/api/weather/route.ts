import { NextResponse } from 'next/server';

interface WeatherResponse {
  temp: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

// Map WMO weather codes to Google-style conditions
const getWeatherCondition = (code: number, isDay: boolean): string => {
  // WMO codes: https://open-meteo.com/en/docs
  const conditions: Record<number, string> = {
    // Clear skies
    0: isDay ? 'Clear' : 'Clear',
    
    // Mainly clear / mostly sunny
    1: isDay ? 'Mostly Sunny' : 'Mostly Clear',
    
    // Partly cloudy
    2: 'Partly Cloudy',
    
    // Overcast
    3: 'Cloudy',
    
    // Fog
    45: 'Fog',
    48: 'Icy Fog',
    
    // Drizzle
    51: 'Light Drizzle',
    53: 'Drizzle',
    55: 'Heavy Drizzle',
    56: 'Freezing Drizzle',
    57: 'Freezing Drizzle',
    
    // Rain
    61: 'Light Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    66: 'Freezing Rain',
    67: 'Freezing Rain',
    
    // Snow
    71: 'Light Snow',
    73: 'Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    
    // Rain showers
    80: 'Light Showers',
    81: 'Showers',
    82: 'Heavy Showers',
    
    // Snow showers
    85: 'Snow Showers',
    86: 'Heavy Snow Showers',
    
    // Thunderstorms
    95: 'Thunderstorm',
    96: 'Thunderstorm',
    99: 'Severe Thunderstorm',
  };
  
  return conditions[code] || 'Clear';
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat') || '14.5995'; // Default: Manila
    const lon = searchParams.get('lon') || '120.9842';
    const location = searchParams.get('location') || 'Manila, PH';

    // Use Open-Meteo API (free, no API key required)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error('Weather API failed');
    }

    const data = await response.json();
    const current = data.current;

    const weather: WeatherResponse = {
      temp: Math.round(current.temperature_2m),
      condition: getWeatherCondition(current.weather_code, current.is_day === 1),
      location: location,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
    };

    return NextResponse.json(weather);
  } catch (error) {
    console.error('Weather fetch error:', error);
    
    // Return fallback data if API fails
    return NextResponse.json({
      temp: 28,
      condition: 'Weather Unavailable',
      location: 'Manila, PH',
      humidity: 0,
      windSpeed: 0,
    });
  }
}
