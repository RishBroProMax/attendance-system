'use client';

import { AttendanceRecord, DailyStats, PrefectRole } from './types';
import { storageManager } from './storage';

const MAX_DAYS = 999999999; // Maximum days to keep records, set to a very high number
const FAILED_ATTEMPTS_KEY = 'admin_failed_attempts';
const LOCKOUT_TIME_KEY = 'admin_lockout_time';
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ADMIN_PIN = 'apple'; // In a production environment, this should be properly secured

export function checkDuplicateAttendance(prefectNumber: string, role: PrefectRole, date: string): boolean {
  const records = storageManager.getRecords();
  return records.some(record => 
    record.prefectNumber === prefectNumber && 
    record.role === role && 
    record.date === date
  );
}

export function checkAdminAccess(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const now = Date.now();
  const storedLockoutTime = Number(localStorage.getItem(LOCKOUT_TIME_KEY) || '0');
  
  if (now < storedLockoutTime) {
    const remainingMinutes = Math.ceil((storedLockoutTime - now) / 60000);
    throw new Error(`Account is locked. Please try again in ${remainingMinutes} minutes.`);
  }

  if (pin === ADMIN_PIN) {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_TIME_KEY);
    return true;
  }

  const failedAttempts = Number(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0') + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, failedAttempts.toString());

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const newLockoutTime = now + LOCKOUT_DURATION;
    localStorage.setItem(LOCKOUT_TIME_KEY, newLockoutTime.toString());
    throw new Error(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION / 60000} minutes.`);
  }

  const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
  throw new Error(`Invalid PIN. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`);
}

export function saveAttendance(prefectNumber: string, role: PrefectRole): AttendanceRecord {
  const now = new Date();
  return saveManualAttendance(prefectNumber, role, now);
}

export function saveManualAttendance(
  prefectNumber: string,
  role: PrefectRole,
  timestamp: Date
): AttendanceRecord {
  const date = timestamp.toLocaleDateString();
  
  if (checkDuplicateAttendance(prefectNumber, role, date)) {
    throw new Error(`A prefect with number ${prefectNumber} has already registered for role ${role} today.`);
  }

  const record: AttendanceRecord = {
    id: crypto.randomUUID(),
    prefectNumber,
    role,
    timestamp: timestamp.toISOString(),
    date,
  };

  try {
    storageManager.addRecord(record);
    cleanOldRecords();
    return record;
  } catch (error) {
    console.error('Failed to save attendance:', error);
    throw new Error('Failed to save attendance record. Please try again.');
  }
}

export function saveBulkAttendance(
  attendanceData: Array<{ prefectNumber: string; role: PrefectRole }>,
  timestamp?: Date
): { success: AttendanceRecord[]; errors: Array<{ prefectNumber: string; role: PrefectRole; error: string }> } {
  const now = timestamp || new Date();
  const date = now.toLocaleDateString();
  const success: AttendanceRecord[] = [];
  const errors: Array<{ prefectNumber: string; role: PrefectRole; error: string }> = [];

  attendanceData.forEach(({ prefectNumber, role }) => {
    try {
      if (checkDuplicateAttendance(prefectNumber, role, date)) {
        errors.push({
          prefectNumber,
          role,
          error: `Already registered for ${role} today`
        });
        return;
      }

      const record = saveManualAttendance(prefectNumber, role, now);
      success.push(record);
    } catch (error) {
      errors.push({
        prefectNumber,
        role,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return { success, errors };
}

export function updateAttendance(
  id: string,
  updates: Partial<AttendanceRecord>
): AttendanceRecord {
  const records = storageManager.getRecords();
  const existingRecord = records.find(r => r.id === id);
  
  if (!existingRecord) {
    throw new Error('Record not found');
  }

  // Check for duplicates when updating prefect number or role
  if (updates.prefectNumber || updates.role) {
    const date = updates.date || existingRecord.date;
    const prefectNumber = updates.prefectNumber || existingRecord.prefectNumber;
    const role = updates.role || existingRecord.role;
    
    const hasDuplicate = records.some(record => 
      record.id !== id && 
      record.prefectNumber === prefectNumber && 
      record.role === role && 
      record.date === date
    );
    
    if (hasDuplicate) {
      throw new Error(`A prefect with number ${prefectNumber} has already registered for role ${role} on ${date}.`);
    }
  }

  try {
    return storageManager.updateRecord(id, updates);
  } catch (error) {
    console.error('Failed to update attendance:', error);
    throw new Error('Failed to update attendance record. Please try again.');
  }
}

export function deleteAttendance(id: string): void {
  try {
    storageManager.deleteRecord(id);
  } catch (error) {
    console.error('Failed to delete attendance:', error);
    throw new Error('Failed to delete attendance record. Please try again.');
  }
}

export function getAttendanceRecords(): AttendanceRecord[] {
  return storageManager.getRecords();
}

export function searchPrefectRecords(prefectNumber: string): AttendanceRecord[] {
  const records = storageManager.getRecords();
  return records
    .filter(record => record.prefectNumber.toLowerCase().includes(prefectNumber.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getPrefectStats(prefectNumber: string): {
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  attendanceRate: number;
  roles: Record<PrefectRole, number>;
  recentRecords: AttendanceRecord[];
} {
  const records = searchPrefectRecords(prefectNumber);
  const stats = {
    totalDays: records.length,
    onTimeDays: 0,
    lateDays: 0,
    attendanceRate: 0,
    roles: {
      Head: 0,
      Deputy: 0,
      'Senior Executive': 0,
      Executive: 0,
      'Super Senior': 0,
      Senior: 0,
      Junior: 0,
      Sub: 0,
      Apprentice: 0,
      'Games Captain': 0,
    } as Record<PrefectRole, number>,
    recentRecords: records.slice(0, 10)
  };

  records.forEach(record => {
    const time = new Date(record.timestamp);
    if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
      stats.onTimeDays++;
    } else {
      stats.lateDays++;
    }
    stats.roles[record.role]++;
  });

  stats.attendanceRate = stats.totalDays > 0 ? (stats.onTimeDays / stats.totalDays) * 100 : 0;

  return stats;
}

export function exportPrefectReport(prefectNumber: string): string {
  const records = searchPrefectRecords(prefectNumber);
  const stats = getPrefectStats(prefectNumber);

  const header = [
    `# Prefect Attendance Report - ${prefectNumber}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '## Summary Statistics',
    `Total Attendance Days: ${stats.totalDays}`,
    `On Time Days: ${stats.onTimeDays}`,
    `Late Days: ${stats.lateDays}`,
    `Attendance Rate: ${stats.attendanceRate.toFixed(1)}%`,
    '',
    '## Role Distribution',
    ...Object.entries(stats.roles)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => `${role}: ${count} days`),
    '',
    '## Detailed Records',
    ['Date', 'Role', 'Time', 'Status', 'Notes'].join(',')
  ].join('\n');

  const recordsCSV = records.map(record => {
    const time = new Date(record.timestamp);
    const status = time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0) 
      ? 'On Time' 
      : 'Late';
    const timeFormatted = time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const notes = status === 'Late' 
      ? `Arrived ${time.getHours() - 7}h ${time.getMinutes()}m late`
      : 'Regular attendance';
    return [
      record.date,
      record.role,
      timeFormatted,
      status,
      notes
    ].join(',');
  }).join('\n');

  return `${header}\n${recordsCSV}`;
}

export function getDailyStats(date: string): DailyStats {
  const records = storageManager.getRecords().filter(r => r.date === date);
  const stats: DailyStats = {
    total: records.length,
    onTime: 0,
    late: 0,
    byRole: {
      Head: 0,
      Deputy: 0,
      'Senior Executive': 0,
      Executive: 0,
      'Super Senior': 0,
      Senior: 0,
      Junior: 0,
      Sub: 0,
      Apprentice: 0,
      'Games Captain': 0,
    },
  };

  records.forEach(record => {
    const time = new Date(record.timestamp);
    if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
      stats.onTime++;
    } else {
      stats.late++;
    }
    stats.byRole[record.role]++;
  });

  return stats;
}

export function cleanOldRecords() {
  try {
    const records = storageManager.getRecords();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    
    const filteredRecords = records.filter(record => 
      new Date(record.timestamp) > cutoff
    );
    
    if (filteredRecords.length !== records.length) {
      storageManager.saveRecords(filteredRecords);
      console.log(`Cleaned ${records.length - filteredRecords.length} old records`);
    }
  } catch (error) {
    console.error('Failed to clean old records:', error);
  }
}

export function exportAttendance(date: string): string {
  const records = storageManager.getRecords()
    .filter(r => r.date === date)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const stats = getDailyStats(date);
  
  const header = [
    '# Prefect Board Attendance Report',
    `Date: ${formatDate(date)}`,
    `Total Prefects: ${stats.total}`,
    `On Time: ${stats.onTime}`,
    `Late: ${stats.late}`,
    '',
    '## Role Distribution',
    ...Object.entries(stats.byRole)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => `${role}: ${count}`),
    '',
    '## Attendance Records',
    ['Prefect Number', 'Role', 'Time', 'Status', 'Notes'].join(',')
  ].join('\n');

  const recordsCSV = records.map(record => {
    const time = new Date(record.timestamp);
    const status = time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0) 
      ? 'On Time' 
      : 'Late';
    const timeFormatted = time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const notes = status === 'Late' 
      ? `Arrived ${time.getHours() - 7}h ${time.getMinutes()}m late`
      : 'Regular attendance';
    return [
      record.prefectNumber,
      record.role,
      timeFormatted,
      status,
      notes
    ].join(',');
  }).join('\n');

  return `${header}\n${recordsCSV}`;
}

// Storage management functions
export function createBackup(): string {
  return storageManager.createManualBackup();
}

export function restoreFromBackup(backupData: string): void {
  storageManager.restoreFromBackup(backupData);
}

export function getStorageInfo() {
  return storageManager.getStorageInfo();
}

export function addStorageListener(callback: (records: AttendanceRecord[]) => void): () => void {
  return storageManager.addStorageListener(callback);
}