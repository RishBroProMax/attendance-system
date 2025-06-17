'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Keyboard,
  Bell,
  AlertTriangle,
  CheckCircle,
  Code,
  User,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PrefectRole } from '@/lib/types';
import { saveAttendance, checkDuplicateAttendance } from '@/lib/attendance';
import { roles } from '@/lib/constants';

// Keyboard shortcuts for roles
const roleShortcuts: Record<string, PrefectRole> = {
  '1': 'Head',
  '2': 'Deputy',
  '3': 'Senior Executive',
  '4': 'Executive',
  '5': 'Super Senior',
  '6': 'Senior',
  '7': 'Junior',
  '8': 'Sub',
  '9': 'Apprentice',
  '0': 'Games Captain',
};

export default function Home() {
  const [role, setRole] = useState<PrefectRole | ''>('');
  const [prefectNumber, setPrefectNumber] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle number keys when not typing into the prefect number input
      if (document.activeElement?.tagName !== 'INPUT') {
        const selectedRole = roleShortcuts[e.key];
        if (selectedRole) {
          setRole(selectedRole);
          toast.success('Role Selected', {
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
            description: `${selectedRole} selected using keyboard shortcut (${e.key})`,
            duration: 2000,
          });
        }
      }

      // Toggle shortcut visibility with '?' key or Shift + '/'
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !prefectNumber.trim()) {
      toast.error('Please fill in all fields', {
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
        description: 'Both role and prefect number are required.',
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toLocaleDateString();
      const trimmedNumber = prefectNumber.trim();
      
      if (checkDuplicateAttendance(trimmedNumber, role, today)) {
        toast.error('Duplicate Entry', {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          description: `A prefect with number ${trimmedNumber} has already registered for role ${role} today.`,
          duration: 5000,
        });
        return;
      }

      const record = saveAttendance(trimmedNumber, role);
      const time = new Date(record.timestamp);
      const isLate = time.getHours() > 7 || (time.getHours() === 7 && time.getMinutes() > 0);

      // Special notifications
      if (role === 'Head' && (trimmedNumber === '01' || trimmedNumber === '02')) {
        toast.info('Head Prefect Attendance Marked', {
          position: 'top-center',
          icon: <User className="w-6 h-6 text-blue-500" />,
          description: 'Head Prefect attendance has been successfully recorded.',
          duration: 5000,
        });
      } else if (role === 'Sub' && trimmedNumber === '64') {
        toast.info('Developer Attendance Marked', {
          position: 'top-center',
          icon: <Code className="w-6 h-6 text-purple-500" />,
          description:
            'Sub 64 is the mastermind behind this attendance system. Please report any issues or bugs directly to them.',
          duration: 5000,
        });
      } else {
        toast.success('Attendance Marked Successfully', {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          description: `${role} ${trimmedNumber} marked at ${time.toLocaleTimeString()}`,
          duration: 4000,
        });
      }

      if (isLate) {
        toast.warning('Late Arrival Detected', {
          icon: <Bell className="w-6 h-6 text-yellow-500" />,
          description:
            'Your attendance has been marked as late (after 7:00 AM). Please ensure timely arrival.',
          duration: 5000,
        });
      }

      // Clear form after successful submission
      setRole('');
      setPrefectNumber('');
    } catch (error) {
      toast.error('Error', {
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
        description:
          error instanceof Error ? error.message : 'Failed to mark attendance',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center py-8 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-3xl">
      <Card className="w-full max-w-md mx-auto backdrop-blur-xl bg-background/80 border border-white/10 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Prefect Attendance</CardTitle>
          <CardDescription className="text-sm">
            Mark your daily attendance with ease
          </CardDescription>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 backdrop-blur-sm"
            onClick={() => setShowShortcuts((prev) => !prev)}
          >
            <Keyboard className="w-4 h-4 mr-2" />
            {showShortcuts ? 'Hide Shortcuts' : 'Show Shortcuts'}
          </Button>
        </CardHeader>
        <CardContent>
          {showShortcuts && (
            <div className="mb-6 p-4 rounded-lg bg-secondary/30 backdrop-blur-sm border border-white/10">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(roleShortcuts).map(([key, roleName]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-background/50 rounded text-xs border border-white/20">
                      {key}
                    </kbd>
                    <span>{roleName}</span>
                  </div>
                ))}
                <div className="col-span-2 mt-2 flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-background/50 rounded text-xs border border-white/20">
                    ?
                  </kbd>
                  <span>Toggle shortcuts</span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="font-medium">Select Your Role</span>
              </div>
              <Select value={role} onValueChange={(value) => setRole(value as PrefectRole)} disabled={isSubmitting}>
                <SelectTrigger className="w-full bg-background/50 border-white/20 backdrop-blur-sm">
                  <SelectValue placeholder="Choose your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleName, index) => (
                    <SelectItem key={roleName} value={roleName}>
                      <div className="flex items-center justify-between w-full">
                        <span>{roleName}</span>
                        <kbd className="ml-2 px-2 py-0.5 bg-secondary rounded text-xs">
                          {index === 9 ? '0' : (index + 1).toString()}
                        </kbd>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                <span className="font-medium">Prefect Number</span>
              </div>
              <Input
                type="text"
                placeholder="Enter your prefect number"
                value={prefectNumber}
                onChange={(e) => setPrefectNumber(e.target.value)}
                className="w-full bg-background/50 border-white/20 backdrop-blur-sm"
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full text-base font-medium bg-primary/90 hover:bg-primary backdrop-blur-sm flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Mark Attendance
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}