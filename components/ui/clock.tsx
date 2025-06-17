import { useEffect, useState } from 'react';

export function Clock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  
  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center space-y-1 py-2">
      <div className="text-4xl font-bold font-mono tracking-wider text-primary">
        {formatNumber(formattedHours)}:
        {formatNumber(minutes)}:
        {formatNumber(seconds)}
        <span className="text-2xl ml-2">{meridiem}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        {time.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  );
}