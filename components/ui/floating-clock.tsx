
'use client';

import { useEffect, useState } from 'react';
import { Clock, Calendar, MapPin, Cloud, Thermometer, Sun, Moon, Droplet } from 'lucide-react';
import { Card } from './card';
import { toast } from 'sonner';

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  sunrise: string;
  sunset: string;
}

export function FloatingClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
      setDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));

      // Check for 7:00 AM and show toast notification
      if (hours === 7 && minutes === 0 && seconds === 0) {
        toast.info('Time Announcement', {
          description: 'The time is now 7:00 AM.',
          duration: 5000,
        });
      }
    };

    // Simulate weather data (replace with actual API in production)
    const mockWeather = {
      temp: 24,
      condition: 'Partly Cloudy',
      humidity: 60,
      sunrise: '6:15 AM',
      sunset: '6:45 PM'
    };
    setWeather(mockWeather);

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className={`fixed bottom-4 right-4 transition-all duration-300 ${
      isExpanded 
        ? 'w-80 bg-background/95' 
        : 'w-auto bg-background/80'
    } backdrop-blur-sm border rounded-xl shadow-lg hover:shadow-xl`}
    onMouseEnter={() => setIsExpanded(true)}
    onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div className="text-lg font-mono font-semibold" suppressHydrationWarning>
            {time}
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{date}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Mahinda Rajapaksha College Matara</span>
            </div>
            
            {weather && (
              <>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    <span>{weather.temp}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    <span>{weather.condition}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Droplet className="h-4 w-4" />
                  <span>Humidity: {weather.humidity}%</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Sun className="h-4 w-4" />
                  <span>Sunrise: {weather.sunrise}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Moon className="h-4 w-4" />
                  <span>Sunset: {weather.sunset}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}