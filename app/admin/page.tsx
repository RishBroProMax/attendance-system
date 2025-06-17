'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Download,
  ArrowLeft,
  AlertTriangle,
  Search,
  Calendar,
  Trash2,
  Maximize,
  Minimize,
  Edit2,
  Save,
  X,
  FileText,
  Clock,
  Users,
  BarChart,
  Filter,
  Lock,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Fingerprint,
  Shield,
  UserSearch,
  UsersIcon,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { toast } from 'sonner';
import { AttendanceRecord, DailyStats, PrefectRole } from '@/lib/types';
import { getAttendanceRecords, getDailyStats, exportAttendance, updateAttendance, checkAdminAccess } from '@/lib/attendance';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { AnalyticsSection } from '@/components/admin/analytics-section';
import { PrefectSearch } from '@/components/admin/prefect-search';
import { BulkAttendance } from '@/components/admin/bulk-attendance';

const roles: PrefectRole[] = [
  'Head',
  'Deputy',
  'Senior Executive',
  'Executive',
  'Super Senior',
  'Senior',
  'Junior',
  'Sub',
  'Apprentice'
];

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(true);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '']);
  const [activeDigit, setActiveDigit] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<PrefectRole | 'all'>('all');
  const [editForm, setEditForm] = useState({
    prefectNumber: '',
    role: '' as PrefectRole | '',
    time: '',
    date: '',
  });

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handlePinDigitChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPinDigits = [...pinDigits];
    newPinDigits[index] = value;
    setPinDigits(newPinDigits);

    if (value && index < 4) {
      setActiveDigit(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
    
    if (index === 4 && value) {
      handlePinSubmit(undefined, newPinDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      setActiveDigit(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveDigit(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 4) {
      setActiveDigit(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinSubmit = async (e?: React.FormEvent, submittedPin?: string) => {
    e?.preventDefault();
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    const finalPin = submittedPin || pinDigits.join('');
    
    try {
      if (checkAdminAccess(finalPin)) {
        setIsAuthenticated(true);
        setShowPinDialog(false);
        toast.success('Access Granted', {
          description: 'Welcome to the admin panel',
          icon: <ShieldAlert className="h-5 w-5 text-red-500" />,
        });
      }
    } catch (error) {
      toast.error('Access Denied', {
        description: error instanceof Error ? error.message : 'Invalid PIN',
        icon: <ShieldAlert className="h-5 w-5 text-red-500" />,
      });
      setPinDigits(['', '', '', '', '']);
      setActiveDigit(0);
      inputRefs.current[0]?.focus();
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const records = getAttendanceRecords();
    setAllRecords(records);
    const todayRecords = records.filter(r => r.date === date);
    setFilteredRecords(todayRecords);
    setStats(getDailyStats(date));

    const dates = [...new Set(records.map(r => r.date))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    setUniqueDates(dates);

    const lastExport = localStorage.getItem('last_export_date');
    if (lastExport !== date) {
      toast('Daily Export Reminder', {
        description: 'Please remember to export today\'s attendance records before end of day.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        duration: 5000,
      });
    }
  }, [date, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const filtered = allRecords.filter(record => {
      const matchesSearch = record.prefectNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = record.date === date;
      const matchesRole = roleFilter === 'all' || record.role === roleFilter;
      return matchesSearch && matchesDate && matchesRole;
    });
    setFilteredRecords(filtered);
  }, [searchQuery, date, allRecords, roleFilter, isAuthenticated]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-3xl">
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/80 border border-white/10">
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-white" />
                Admin Access
              </DialogTitle>
              <DialogDescription className="text-center">
                Enter your 5-digit PIN to access the admin panel
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <Fingerprint className={`h-16 w-16 text-white transition-opacity duration-500 ${isAuthenticating ? 'animate-pulse' : ''}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              </div>
              <form onSubmit={(e) => handlePinSubmit(e)} className="space-y-6 w-full">
                <div className="flex justify-center gap-3">
                  {pinDigits.map((digit, index) => (
                    <Input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type={showPin ? "text" : "password"}
                      value={digit}
                      onChange={(e) => handlePinDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-2xl bg-background/50 border-white/20 backdrop-blur-sm"
                      maxLength={1}
                      disabled={isAuthenticating}
                    />
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPin(!showPin)}
                    className="gap-2 backdrop-blur-sm"
                    disabled={isAuthenticating}
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="h-4 w-4 text-white" /> Hide PIN
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 text-white" /> Show PIN
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
            <DialogFooter className="flex-col space-y-2">
              <DialogDescription className="text-xs text-center text-muted-foreground">
                Your session will be locked after 3 failed attempts
              </DialogDescription>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('No Records to Export', {
        description: 'There are no attendance records for the selected date.',
        duration: 4000,
      });
      return;
    }

    const csv = exportAttendance(date);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${date.replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    localStorage.setItem('last_export_date', date);
    toast.success('Export Successful', {
      description: 'Attendance records have been exported to CSV format.',
      duration: 4000,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedDate = new Date(e.target.value);
      if (isNaN(selectedDate.getTime())) {
        throw new Error('Invalid date');
      }
      setDate(selectedDate.toLocaleDateString());
    } catch (error) {
      toast.error('Invalid Date', {
        description: 'Please select a valid date.',
        duration: 3000,
      });
    }
  };

  const handleClearData = () => {
    localStorage.removeItem('prefect_attendance_records');
    localStorage.removeItem('last_export_date');
    setAllRecords([]);
    setFilteredRecords([]);
    setStats(null);
    setUniqueDates([]);
    setShowClearDialog(false);
    toast.success('Data Cleared', {
      description: 'All attendance records have been cleared successfully.',
    });
  };

  const toggleFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch (error) {
      toast.error('Fullscreen Error', {
        description: 'Unable to toggle fullscreen mode.',
        duration: 3000,
      });
    }
  };

  const startEditing = (record: AttendanceRecord) => {
    const timestamp = new Date(record.timestamp);
    setEditingRecord(record.id);
    setEditForm({
      prefectNumber: record.prefectNumber,
      role: record.role,
      date: timestamp.toISOString().split('T')[0],
      time: timestamp.toTimeString().split(' ')[0].slice(0, 5),
    });
  };

  const saveEdit = (id: string) => {
    try {
      const timestamp = new Date(`${editForm.date}T${editForm.time}`);
      if (isNaN(timestamp.getTime())) {
        throw new Error('Invalid date/time');
      }

      if (!editForm.role || !editForm.prefectNumber) {
        throw new Error('All fields are required');
      }

      const updatedRecord = updateAttendance(id, {
        prefectNumber: editForm.prefectNumber,
        role: editForm.role as PrefectRole,
        timestamp: timestamp.toISOString(),
        date: timestamp.toLocaleDateString(),
      });

      setAllRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
      setEditingRecord(null);
      
      toast.success('Record Updated', {
        description: 'The attendance record has been updated successfully.',
      });
    } catch (error) {
      toast.error('Update Failed', {
        description: error instanceof Error ? error.message : 'Failed to update the record.',
      });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] p-4 sm:p-8 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-3xl">
      <div className="absolute inset-0 -z-10" />
      <div className="relative max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2 backdrop-blur-sm bg-background/50 border border-white/10">
                <ArrowLeft className="h-4 w-4 text-white" /> Back
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullScreen}
              className="hidden sm:flex backdrop-blur-sm bg-background/50 border border-white/10"
            >
              {isFullScreen ? (
                <Minimize className="h-4 w-4 text-white" />
              ) : (
                <Maximize className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
              <Input
                type="text"
                placeholder="Search by prefect number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-white/20 backdrop-blur-sm"
              />
            </div>
            <div className="relative flex-1 sm:flex-initial">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
              <Input
                type="date"
                value={new Date(date).toISOString().split('T')[0]}
                onChange={handleDateChange}
                className="pl-10 bg-background/50 border-white/20 backdrop-blur-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as PrefectRole | 'all')}>
              <SelectTrigger className="w-[180px] bg-background/50 border-white/20 backdrop-blur-sm">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="gap-2 w-full sm:w-auto bg-primary/90 hover:bg-primary backdrop-blur-sm">
              <Download className="h-4 w-4 text-white" /> Export Records
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowClearDialog(true)}
              className="gap-2 w-full sm:w-auto backdrop-blur-sm"
            >
              <Trash2 className="h-4 w-4 text-white" /> Clear Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="backdrop-blur-sm bg-background/50 border border-white/10">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart className="h-4 w-4 text-white" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <UserSearch className="h-4 w-4 text-white" />
              Search Prefect
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <UsersIcon className="h-4 w-4 text-white" />
              Bulk Entry
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart className="h-4 w-4 text-white" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2">
              <Database className="h-4 w-4 text-white" />
              Backup & Sync
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="h-4 w-4 text-white" />
              Records
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4 text-white" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-white" />
                    Today's Overview
                  </CardTitle>
                  <CardDescription>{date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg backdrop-blur-sm">
                      <span>Total Prefects</span>
                      <span className="font-bold text-lg">{stats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg backdrop-blur-sm border border-green-500/20">
                      <span>On Time</span>
                      <span className="font-bold text-lg text-green-500">{stats?.onTime || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg backdrop-blur-sm border border-red-500/20">
                      <span>Late</span>
                      <span className="font-bold text-lg text-red-500">{stats?.late || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-white" />
                    Role Distribution
                  </CardTitle>
                  <CardDescription>Attendance by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats && Object.entries(stats.byRole)
                      .filter(([_, count]) => count > 0)
                      .map(([role, count]) => (
                        <div key={role} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg backdrop-blur-sm">
                          <span>{role}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))
                    }
                    {(!stats || Object.values(stats.byRole).every(count => count === 0)) && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No role distribution data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-white" />
                    Attendance Timeline
                  </CardTitle>
                  <CardDescription>Arrival pattern for {date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredRecords
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((record, index) => {
                        const time = new Date(record.timestamp);
                        const isLate = time.getHours() >= 7 && time.getMinutes() > 0;
                        return (
                          <div
                            key={record.id}
                            className={`p-3 rounded-lg backdrop-blur-sm border ${
                              isLate ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {time.toLocaleTimeString()}
                              </span>
                              <span className={`text-sm ${
                                isLate ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {isLate ? 'Late' : 'On Time'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {record.prefectNumber} ({record.role})
                            </div>
                          </div>
                        );
                      })
                    }
                    {filteredRecords.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No attendance records for this date
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="search">
            <PrefectSearch />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkAttendance />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsSection records={allRecords} />
          </TabsContent>

         

          <TabsContent value="records">
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-white" />
                  Attendance Records
                </CardTitle>
                <CardDescription>All records for {date}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredRecords.map(record => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg backdrop-blur-sm border border-white/10">
                      {editingRecord === record.id ? (
                        <div className="w-full space-y-3">
                          <div className="flex gap-3">
                            <Input
                              value={editForm.prefectNumber}
                              onChange={(e) => setEditForm(prev => ({ ...prev, prefectNumber: e.target.value }))}
                              placeholder="Prefect Number"
                              className="bg-background/50 border-white/20 backdrop-blur-sm"
                            />
                            <Select
                              value={editForm.role}
                              onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as PrefectRole }))}
                            >
                              <SelectTrigger className="bg-background/50 border-white/20 backdrop-blur-sm">
                                <SelectValue placeholder="Role" />
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
                          <div className="flex gap-3">
                            <Input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                              className="bg-background/50 border-white/20 backdrop-blur-sm"
                            />
                            <Input
                              type="time"
                              value={editForm.time}
                              onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                              className="bg-background/50 border-white/20 backdrop-blur-sm"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRecord(null)}
                              className="backdrop-blur-sm"
                            >
                              <X className="h-4 w-4 text-white" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(record.id)}
                              className="backdrop-blur-sm"
                            >
                              <Save className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.prefectNumber}</span>
                            <span className="text-sm text-muted-foreground">{record.role}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-sm">{new Date(record.timestamp).toLocaleTimeString()}</span>
                              <span className={`block text-xs ${
                                new Date(record.timestamp).getHours() >= 7 && 
                                new Date(record.timestamp).getMinutes() > 0
                                  ? 'text-red-500'
                                  : 'text-green-500'
                              }`}>
                                {new Date(record.timestamp).getHours() >= 7 && 
                                 new Date(record.timestamp).getMinutes() > 0 ? 'Late' : 'On Time'}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(record)}
                              className="backdrop-blur-sm"
                            >
                              <Edit2 className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {filteredRecords.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No records found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-white" />
                  Previous Records
                </CardTitle>
                <CardDescription>View and export past attendance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {uniqueDates.map((recordDate) => {
                    const dateStats = getDailyStats(recordDate);
                    return (
                      <div
                        key={recordDate}
                        className="p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors backdrop-blur-sm bg-background/50 border-white/10"
                        onClick={() => setDate(recordDate)}
                      >
                        <p className="font-medium">{recordDate}</p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p className="flex justify-between">
                            <span>Total:</span>
                            <span>{dateStats.total}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>On Time:</span>
                            <span className="text-green-500">{dateStats.onTime}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Late:</span>
                            <span className="text-red-500">{dateStats.late}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {uniqueDates.length === 0 && (
                    <p className="text-muted-foreground text-sm col-span-full text-center py-4">
                      No previous records found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="backdrop-blur-xl bg-background/80 border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all attendance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="backdrop-blur-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground backdrop-blur-sm">
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}