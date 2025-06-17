'use client';

import { AttendanceRecord, DailyStats, PrefectRole } from './types';
import { StorageManager } from './storage';

const MAX_DAYS = 365; // Maximum days to keep records
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ADMIN_PIN = 'apple'; // In production, this should be properly secured

export function checkDuplicateAttendance(prefectNumber: string, role: PrefectRole, date: string): boolean {
  const records = getAttendanceRecords();
  return records.some(record => 
    record.prefectNumber === prefectNumber && 
    record.role === role && 
    record.date === date
  );
}

export function checkAdminAccess(pin: string): boolean {
  const now = Date.now();
  const storedLockoutTime = Number(StorageManager.getItem('ADMIN_LOCKOUT_TIME', '0'));
  
  if (now < storedLockoutTime) {
    const remainingMinutes = Math.ceil((storedLockoutTime - now) / 60000);
    throw new Error(`Account is locked. Please try again in ${remainingMinutes} minutes.`);
  }

  if (pin === ADMIN_PIN) {
    StorageManager.removeItem('ADMIN_FAILED_ATTEMPTS');
    StorageManager.removeItem('ADMIN_LOCKOUT_TIME');
    return true;
  }

  const failedAttempts = Number(StorageManager.getItem('ADMIN_FAILED_ATTEMPTS', '0')) + 1;
  StorageManager.setItem('ADMIN_FAILED_ATTEMPTS', failedAttempts.toString());

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const newLockoutTime = now + LOCKOUT_DURATION;
    StorageManager.setItem('ADMIN_LOCKOUT_TIME', newLockoutTime.toString());
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

  const records = getAttendanceRecords();
  
  const record: AttendanceRecord = {
    id: crypto.randomUUID(),
    prefectNumber: prefectNumber.trim(),
    role,
    timestamp: timestamp.toISOString(),
    date,
  };

  records.push(record);
  
  const success = StorageManager.setItem('ATTENDANCE_RECORDS', records);
  if (!success) {
    throw new Error('Failed to save attendance record to storage');
  }
  
  cleanOldRecords();
  return record;
}

export function saveBulkAttendance(
  attendanceData: Array<{ prefectNumber: string; role: PrefectRole }>,
  timestamp?: Date
): { success: AttendanceRecord[]; errors: Array<{ prefectNumber: string; role: PrefectRole; error: string }> } {
  const now = timestamp || new Date();
  const date = now.toLocaleDateString();
  const success: AttendanceRecord[] = [];
  const errors: Array<{ prefectNumber: string; role: PrefectRole; error: string }> = [];

  // Validate input data
  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    throw new Error('Invalid attendance data: must be a non-empty array');
  }

  // Get current records once
  const currentRecords = getAttendanceRecords();
  const newRecords: AttendanceRecord[] = [];

  attendanceData.forEach(({ prefectNumber, role }) => {
    try {
      // Validate individual entry
      if (!prefectNumber || !prefectNumber.trim()) {
        errors.push({
          prefectNumber: prefectNumber || '',
          role,
          error: 'Prefect number is required'
        });
        return;
      }

      if (!role) {
        errors.push({
          prefectNumber: prefectNumber.trim(),
          role: role || 'Unknown' as PrefectRole,
          error: 'Role is required'
        });
        return;
      }

      const trimmedNumber = prefectNumber.trim();

      // Check for duplicates in current records
      const existsInCurrent = currentRecords.some(record => 
        record.prefectNumber === trimmedNumber && 
        record.role === role && 
        record.date === date
      );

      if (existsInCurrent) {
        errors.push({
          prefectNumber: trimmedNumber,
          role,
          error: `Already registered for ${role} today`
        });
        return;
      }

      // Check for duplicates in this batch
      const existsInBatch = newRecords.some(record => 
        record.prefectNumber === trimmedNumber && 
        record.role === role
      );

      if (existsInBatch) {
        errors.push({
          prefectNumber: trimmedNumber,
          role,
          error: `Duplicate entry in this batch`
        });
        return;
      }

      const record: AttendanceRecord = {
        id: crypto.randomUUID(),
        prefectNumber: trimmedNumber,
        role,
        timestamp: now.toISOString(),
        date,
      };

      newRecords.push(record);
      success.push(record);
    } catch (error) {
      errors.push({
        prefectNumber: prefectNumber?.trim() || '',
        role: role || 'Unknown' as PrefectRole,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save all successful records at once
  if (newRecords.length > 0) {
    const allRecords = [...currentRecords, ...newRecords];
    const saveSuccess = StorageManager.setItem('ATTENDANCE_RECORDS', allRecords);
    
    if (!saveSuccess) {
      // If save fails, mark all as errors
      newRecords.forEach(record => {
        errors.push({
          prefectNumber: record.prefectNumber,
          role: record.role,
          error: 'Failed to save to storage'
        });
      });
      success.length = 0; // Clear success array
    }
  }

  return { success, errors };
}

export function updateAttendance(
  id: string,
  updates: Partial<AttendanceRecord>
): AttendanceRecord {
  const records = getAttendanceRecords();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('Record not found');
  }

  // Check for duplicates when updating prefect number or role
  if (updates.prefectNumber || updates.role) {
    const date = updates.date || records[index].date;
    const prefectNumber = (updates.prefectNumber || records[index].prefectNumber).trim();
    const role = updates.role || records[index].role;
    
    const hasDuplicate = records.some((record, i) => 
      i !== index && 
      record.prefectNumber === prefectNumber && 
      record.role === role && 
      record.date === date
    );
    
    if (hasDuplicate) {
      throw new Error(`A prefect with number ${prefectNumber} has already registered for role ${role} on ${date}.`);
    }
  }

  const updatedRecord = {
    ...records[index],
    ...updates,
    prefectNumber: updates.prefectNumber ? updates.prefectNumber.trim() : records[index].prefectNumber
  };

  records[index] = updatedRecord;
  
  const success = StorageManager.setItem('ATTENDANCE_RECORDS', records);
  if (!success) {
    throw new Error('Failed to update record in storage');
  }
  
  return updatedRecord;
}

export function deleteAttendance(id: string): void {
  const records = getAttendanceRecords();
  const filteredRecords = records.filter(r => r.id !== id);
  
  const success = StorageManager.setItem('ATTENDANCE_RECORDS', filteredRecords);
  if (!success) {
    throw new Error('Failed to delete record from storage');
  }
}

export function getAttendanceRecords(): AttendanceRecord[] {
  return StorageManager.getItem('ATTENDANCE_RECORDS', []);
}

export function searchPrefectRecords(prefectNumber: string): AttendanceRecord[] {
  const records = getAttendanceRecords();
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
  const records = getAttendanceRecords().filter(r => r.date === date);
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
  const records = getAttendanceRecords();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_DAYS);
  
  const filteredRecords = records.filter(record => 
    new Date(record.timestamp) > cutoff
  );
  
  if (filteredRecords.length !== records.length) {
    StorageManager.setItem('ATTENDANCE_RECORDS', filteredRecords);
  }
}

export function exportAttendance(date: string): string {
  const records = getAttendanceRecords()
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