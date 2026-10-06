import { useEffect, useState } from 'react';

interface WeatherCardProps {
  location?: string;
}

export function WeatherCard({ location = 'Cary' }: WeatherCardProps) {
  const [weather, setWeather] = useState<{ temperature?: number; summary?: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      const response = await fetch('/api/weather/forecast');
      const payload = (await response.json()) as {
        location?: string;
        summary?: string;
        temperature?: number;
      };

      setWeather({
        temperature: payload.temperature,
        summary: payload.summary,
      });
    };

    void fetchWeather();
  }, []);

  return (
    <section aria-label="weather-card">
      <h2>{location}</h2>
      <button type="button">Load forecast</button>
      {weather ? (
        <div>
          <p>{weather.summary}</p>
          <p>{weather.temperature}°F</p>
        </div>
      ) : (
        <p>Loading forecast...</p>
      )}
    </section>
  );
}
