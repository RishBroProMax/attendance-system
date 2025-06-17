'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, Plus, Trash2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveBulkAttendance } from '@/lib/attendance';
import { PrefectRole } from '@/lib/types';
import { roles } from '@/lib/constants';

// Simple modal/popup component
function WarningModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-lg shadow-xl p-8 max-w-md w-full border border-red-500">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="text-red-500 h-10 w-10" />
          <h2 className="text-lg font-bold text-red-600 text-center">
            Warning: Testing Option
          </h2>
          <p className="text-sm text-center text-red-500">
            This is a <b>testing</b> feature. My developer <b>does NOT recommend</b> using it. 
            If you use this, <span className="font-semibold">your attendance data may get corrupted</span> at any time.<br /><br />
            <b>Proceed with extreme caution!</b>
          </p>
          <Button onClick={onClose} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white">
            I Understand, Continue Anyway
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BulkEntry {
  id: string;
  prefectNumber: string;
  role: PrefectRole | '';
}

export function BulkAttendance() {
  const [showWarning, setShowWarning] = useState(true);

  const [entries, setEntries] = useState<BulkEntry[]>([
    { id: crypto.randomUUID(), prefectNumber: '', role: '' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    success: Array<{ prefectNumber: string; role: string }>;
    errors: Array<{ prefectNumber: string; role: string; error: string }>;
  } | null>(null);

  // Prevent accidental closing (optional, for dramatic effect)
  useEffect(() => {
    if (showWarning) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showWarning]);

  const addEntry = () => {
    setEntries([...entries, { id: crypto.randomUUID(), prefectNumber: '', role: '' }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const updateEntry = (id: string, field: 'prefectNumber' | 'role', value: string) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const clearAll = () => {
    setEntries([{ id: crypto.randomUUID(), prefectNumber: '', role: '' }]);
    setResults(null);
  };

  const processBulkAttendance = async () => {
    const validEntries = entries.filter(entry => 
      entry.prefectNumber.trim() && entry.role
    );

    if (validEntries.length === 0) {
      toast.error('No valid entries found', {
        description: 'Please add at least one entry with prefect number and role',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const attendanceData = validEntries.map(entry => ({
        prefectNumber: entry.prefectNumber.trim(),
        role: entry.role as PrefectRole
      }));

      const result = saveBulkAttendance(attendanceData);
      setResults(result);

      if (result.success.length > 0) {
        toast.success('Bulk Attendance Processed', {
          description: `${result.success.length} records added successfully`,
        });
      }

      if (result.errors.length > 0) {
        toast.warning('Some entries failed', {
          description: `${result.errors.length} entries had errors`,
        });
      }
    } catch (error) {
      toast.error('Processing Failed', {
        description: 'An error occurred while processing bulk attendance',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportTemplate = () => {
    const csvContent = [
      'Prefect Number,Role',
      '64,Sub',
      '25,Senior',
      '12,Executive',
      '// Add your entries below this line',
      ',',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_attendance_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Template Downloaded', {
      description: 'CSV template has been downloaded',
    });
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').slice(1); // Skip header
        const newEntries: BulkEntry[] = [];

        lines.forEach(line => {
          const [prefectNumber, role] = line.split(',').map(s => s.trim());
          if (prefectNumber && role && roles.includes(role as PrefectRole)) {
            newEntries.push({
              id: crypto.randomUUID(),
              prefectNumber,
              role: role as PrefectRole
            });
          }
        });

        if (newEntries.length > 0) {
          setEntries(newEntries);
          toast.success('CSV Imported', {
            description: `${newEntries.length} entries imported successfully`,
          });
        } else {
          toast.error('No valid entries found in CSV');
        }
      } catch (error) {
        toast.error('Import Failed', {
          description: 'Could not parse the CSV file',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <WarningModal open={showWarning} onClose={() => setShowWarning(false)} />
      <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Attendance Entry
          </CardTitle>
          <CardDescription>
            Add multiple attendance records at once for efficient data entry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={addEntry} className="gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
            <Button onClick={clearAll} variant="outline" className="gap-2 bg-background/50 border-white/20 backdrop-blur-sm">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
            <Button onClick={exportTemplate} variant="outline" className="gap-2 bg-background/50 border-white/20 backdrop-blur-sm">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={importFromCSV}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="gap-2 bg-background/50 border-white/20 backdrop-blur-sm">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex gap-3 items-center p-3 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
                <span className="text-sm font-medium w-8">{index + 1}</span>
                <Input
                  placeholder="Prefect Number"
                  value={entry.prefectNumber}
                  onChange={(e) => updateEntry(entry.id, 'prefectNumber', e.target.value)}
                  className="flex-1 bg-background/50 border-white/20 backdrop-blur-sm"
                />
                <Select
                  value={entry.role}
                  onValueChange={(value) => updateEntry(entry.id, 'role', value)}
                >
                  <SelectTrigger className="w-[180px] bg-background/50 border-white/20 backdrop-blur-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntry(entry.id)}
                  disabled={entries.length === 1}
                  className="hover:bg-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button 
            onClick={processBulkAttendance} 
            disabled={isProcessing}
            className="w-full bg-primary/90 hover:bg-primary backdrop-blur-sm"
          >
            {isProcessing ? 'Processing...' : `Process ${entries.filter(e => e.prefectNumber.trim() && e.role).length} Entries`}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Processing Results
            </CardTitle>
            <CardDescription>
              Summary of bulk attendance processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-green-500 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Successful ({results.success.length})
                </h4>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {results.success.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded bg-green-500/10 border border-green-500/20">
                      <span>{item.prefectNumber}</span>
                      <Badge variant="outline" className="border-green-500/50 text-green-500">
                        {item.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Failed ({results.errors.length})
                </h4>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {results.errors.map((item, index) => (
                    <div key={index} className="p-2 rounded bg-red-500/10 border border-red-500/20">
                      <div className="flex justify-between items-center">
                        <span>{item.prefectNumber}</span>
                        <Badge variant="outline" className="border-red-500/50 text-red-500">
                          {item.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-red-400 mt-1">{item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}