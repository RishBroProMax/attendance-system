'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, Plus, Trash2, Users, CheckCircle, AlertCircle, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveBulkAttendance } from '@/lib/attendance';
import { PrefectRole } from '@/lib/types';
import { roles } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';

interface BulkEntry {
  id: string;
  prefectNumber: string;
  role: PrefectRole | '';
  isValid: boolean;
  error?: string;
}

interface ProcessingResult {
  success: Array<{ prefectNumber: string; role: string }>;
  errors: Array<{ prefectNumber: string; role: string; error: string }>;
}

export function BulkAttendance() {
  const [entries, setEntries] = useState<BulkEntry[]>([
    { id: crypto.randomUUID(), prefectNumber: '', role: '', isValid: false }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Validate individual entry
  const validateEntry = (entry: BulkEntry): { isValid: boolean; error?: string } => {
    if (!entry.prefectNumber.trim()) {
      return { isValid: false, error: 'Prefect number is required' };
    }
    
    if (!entry.role) {
      return { isValid: false, error: 'Role is required' };
    }

    // Check for duplicate prefect numbers in the same batch
    const duplicates = entries.filter(e => 
      e.id !== entry.id && 
      e.prefectNumber.trim() === entry.prefectNumber.trim() && 
      e.role === entry.role
    );
    
    if (duplicates.length > 0) {
      return { isValid: false, error: 'Duplicate entry in batch' };
    }

    return { isValid: true };
  };

  // Update entry validation when entries change
  useEffect(() => {
    setEntries(prevEntries => 
      prevEntries.map(entry => {
        const validation = validateEntry(entry);
        return {
          ...entry,
          isValid: validation.isValid,
          error: validation.error
        };
      })
    );
  }, [entries.length]);

  const addEntry = () => {
    const newEntry: BulkEntry = {
      id: crypto.randomUUID(),
      prefectNumber: '',
      role: '',
      isValid: false
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const updateEntry = (id: string, field: 'prefectNumber' | 'role', value: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        const validation = validateEntry(updatedEntry);
        return {
          ...updatedEntry,
          isValid: validation.isValid,
          error: validation.error
        };
      }
      return entry;
    }));
  };

  const clearAll = () => {
    setEntries([{ id: crypto.randomUUID(), prefectNumber: '', role: '', isValid: false }]);
    setResults(null);
    setProcessingProgress(0);
  };

  const processBulkAttendance = async () => {
    const validEntries = entries.filter(entry => entry.isValid && entry.prefectNumber.trim() && entry.role);

    if (validEntries.length === 0) {
      toast.error('No valid entries found', {
        description: 'Please add at least one entry with prefect number and role',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const attendanceData = validEntries.map(entry => ({
        prefectNumber: entry.prefectNumber.trim(),
        role: entry.role as PrefectRole
      }));

      const result = saveBulkAttendance(attendanceData);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      setResults(result);

      if (result.success.length > 0) {
        toast.success('Bulk Attendance Processed', {
          description: `${result.success.length} records added successfully`,
          duration: 5000,
        });
      }

      if (result.errors.length > 0) {
        toast.warning('Some entries failed', {
          description: `${result.errors.length} entries had errors`,
          duration: 5000,
        });
      }

      // Clear successful entries from the form
      if (result.success.length > 0) {
        const successfulNumbers = new Set(
          result.success.map(s => `${s.prefectNumber}-${s.role}`)
        );
        
        const remainingEntries = entries.filter(entry => {
          const key = `${entry.prefectNumber.trim()}-${entry.role}`;
          return !successfulNumbers.has(key);
        });

        if (remainingEntries.length === 0) {
          setEntries([{ id: crypto.randomUUID(), prefectNumber: '', role: '', isValid: false }]);
        } else {
          setEntries(remainingEntries);
        }
      }

    } catch (error) {
      toast.error('Processing Failed', {
        description: error instanceof Error ? error.message : 'An error occurred while processing bulk attendance',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 2000);
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
          if (prefectNumber && role && roles.includes(role as PrefectRole) && !prefectNumber.startsWith('//')) {
            const entry: BulkEntry = {
              id: crypto.randomUUID(),
              prefectNumber,
              role: role as PrefectRole,
              isValid: true
            };
            newEntries.push(entry);
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

  const validEntryCount = entries.filter(e => e.isValid).length;

  return (
    <div className="space-y-6">
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
          {/* Progress bar during processing */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing entries...</span>
                <span>{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={addEntry} className="gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm" disabled={isProcessing}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
            <Button onClick={clearAll} variant="outline" className="gap-2 bg-background/50 border-white/20 backdrop-blur-sm" disabled={isProcessing}>
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
                disabled={isProcessing}
              />
              <Button variant="outline" className="gap-2 bg-background/50 border-white/20 backdrop-blur-sm" disabled={isProcessing}>
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {entries.map((entry, index) => (
              <div key={entry.id} className={`flex gap-3 items-center p-3 rounded-lg backdrop-blur-sm border ${
                entry.isValid ? 'bg-background/30 border-white/10' : 'bg-red-500/10 border-red-500/20'
              }`}>
                <span className="text-sm font-medium w-8">{index + 1}</span>
                <Input
                  placeholder="Prefect Number"
                  value={entry.prefectNumber}
                  onChange={(e) => updateEntry(entry.id, 'prefectNumber', e.target.value)}
                  className={`flex-1 bg-background/50 backdrop-blur-sm ${
                    entry.error && entry.prefectNumber ? 'border-red-500/50' : 'border-white/20'
                  }`}
                  disabled={isProcessing}
                />
                <Select
                  value={entry.role}
                  onValueChange={(value) => updateEntry(entry.id, 'role', value)}
                  disabled={isProcessing}
                >
                  <SelectTrigger className={`w-[180px] bg-background/50 backdrop-blur-sm ${
                    entry.error && entry.role ? 'border-red-500/50' : 'border-white/20'
                  }`}>
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
                  disabled={entries.length === 1 || isProcessing}
                  className="hover:bg-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {entry.error && (
                  <div className="text-xs text-red-500 ml-2 max-w-[120px]">
                    {entry.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {validEntryCount} of {entries.length} entries valid
            </div>
            <Button 
              onClick={processBulkAttendance} 
              disabled={isProcessing || validEntryCount === 0}
              className="bg-primary/90 hover:bg-primary backdrop-blur-sm gap-2"
            >
              {isProcessing ? (
                <>
                  <Save className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Process {validEntryCount} Entries
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
                      <span className="font-mono text-sm">{item.prefectNumber}</span>
                      <Badge variant="outline" className="border-green-500/50 text-green-500">
                        {item.role}
                      </Badge>
                    </div>
                  ))}
                  {results.success.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No successful entries</p>
                  )}
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
                        <span className="font-mono text-sm">{item.prefectNumber}</span>
                        <Badge variant="outline" className="border-red-500/50 text-red-500">
                          {item.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-red-400 mt-1">{item.error}</p>
                    </div>
                  ))}
                  {results.errors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No failed entries</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}