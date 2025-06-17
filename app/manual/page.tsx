'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock as ClockIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PrefectRole } from '@/lib/types';
import { saveManualAttendance } from '@/lib/attendance';

const roles: PrefectRole[] = [
  'Head',
  'Deputy',
  'Senior Executive',
  'Executive',
  'Super Senior',
  'Senior',
  'Junior',
  'Sub',
  'Apprentice',
  'Games Captain',
];

export default function ManualAttendance() {
  const [role, setRole] = useState<PrefectRole | ''>('');
  const [prefectNumber, setPrefectNumber] = useState('');
  const [dateTime, setDateTime] = useState('');

  useEffect(() => {
    const currentDateTime = new Date().toISOString().slice(0, 16);
    setDateTime(currentDateTime);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !prefectNumber || !dateTime) {
      toast.error('Please fill in all fields', {
        description: 'All fields are required for manual attendance.',
        duration: 3000,
      });
      return;
    }

    try {
      const timestamp = new Date(dateTime);
      if (isNaN(timestamp.getTime())) {
        throw new Error('Invalid date/time format');
      }

      const record = await saveManualAttendance(prefectNumber, role, timestamp);
      const isLate = timestamp.getHours() >= 7 && timestamp.getMinutes() > 0;

      toast.success('Manual Attendance Marked', {
        description: `${role} ${prefectNumber} marked for ${timestamp.toLocaleString()}`,
        duration: 4000,
      });

      if (isLate) {
        toast.warning('Late Arrival Recorded', {
          description: 'This attendance has been marked as late (after 7:00 AM).',
          duration: 5000,
        });
      }

      setRole('');
      setPrefectNumber('');
      setDateTime(new Date().toISOString().slice(0, 16));
    } catch (error) {
      toast.error('Invalid Date/Time', {
        description: 'Please enter a valid date and time.',
        duration: 3000,
      });
    }
  };

  const handleResetDateTime = () => {
    const currentDateTime = new Date().toISOString().slice(0, 16);
    setDateTime(currentDateTime);
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-3xl">
      <Card className="w-full max-w-md mx-auto backdrop-blur-xl bg-background/80 border border-white/10 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center backdrop-blur-sm">
            <ClockIcon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Manual Attendance</CardTitle>
          <CardDescription className="text-sm">Enter attendance with custom date/time</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Select value={role} onValueChange={(value) => setRole(value as PrefectRole)}>
                <SelectTrigger className="bg-background/50 border-white/20 backdrop-blur-sm">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter your prefect number"
                value={prefectNumber}
                onChange={(e) => setPrefectNumber(e.target.value)}
                className="bg-background/50 border-white/20 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="bg-background/50 border-white/20 backdrop-blur-sm"
              />
            </div>

            <Button type="submit" className="w-full text-base font-medium bg-primary/90 hover:bg-primary backdrop-blur-sm">
              Mark Manual Attendance
            </Button>
            <Button 
              type="button" 
              className="w-full text-base font-medium mt-2 flex items-center justify-center bg-secondary/90 hover:bg-secondary backdrop-blur-sm" 
              onClick={handleResetDateTime}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Current Date/Time
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}