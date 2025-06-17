import { StorageManager } from './storage';
import { AttendanceRecord } from './types';

export interface BackupData {
  version: string;
  timestamp: string;
  systemInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
  data: {
    attendanceRecords: AttendanceRecord[];
    backupHistory: BackupHistoryEntry[];
    scanHistory: any[];
    lastExportDate: string | null;
  };
  checksum: string;
}

export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  version: string;
  recordCount: number;
  size: number;
}

export class BackupManager {
  private static generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  static createBackup(): BackupData {
    const attendanceRecords = StorageManager.getItem('ATTENDANCE_RECORDS', []);
    const backupHistory = StorageManager.getItem('BACKUP_HISTORY', []);
    const scanHistory = StorageManager.getItem('SCAN_HISTORY', []);
    const lastExportDate = StorageManager.getItem('LAST_EXPORT_DATE', null);

    const backupData: BackupData = {
      version: '6.0.4',
      timestamp: new Date().toISOString(),
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      },
      data: {
        attendanceRecords,
        backupHistory,
        scanHistory,
        lastExportDate
      },
      checksum: ''
    };

    // Generate checksum
    const dataString = JSON.stringify(backupData.data);
    backupData.checksum = this.generateChecksum(dataString);

    return backupData;
  }

  static exportBackup(): { success: boolean; data?: string; error?: string } {
    try {
      const backup = this.createBackup();
      const backupString = JSON.stringify(backup, null, 2);

      // Add to backup history
      const historyEntry: BackupHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: backup.timestamp,
        version: backup.version,
        recordCount: backup.data.attendanceRecords.length,
        size: new Blob([backupString]).size
      };

      const history = StorageManager.getItem('BACKUP_HISTORY', []);
      history.unshift(historyEntry);
      
      // Keep only last 10 backups in history
      if (history.length > 10) {
        history.splice(10);
      }
      
      StorageManager.setItem('BACKUP_HISTORY', history);

      return { success: true, data: backupString };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during backup export' 
      };
    }
  }

  static validateBackup(backupString: string): { valid: boolean; error?: string; data?: BackupData } {
    try {
      const backup: BackupData = JSON.parse(backupString);

      // Check required fields
      if (!backup.version || !backup.timestamp || !backup.data || !backup.checksum) {
        return { valid: false, error: 'Invalid backup format: missing required fields' };
      }

      // Validate checksum
      const dataString = JSON.stringify(backup.data);
      const expectedChecksum = this.generateChecksum(dataString);
      
      if (backup.checksum !== expectedChecksum) {
        return { valid: false, error: 'Backup file is corrupted (checksum mismatch)' };
      }

      // Validate data structure
      if (!Array.isArray(backup.data.attendanceRecords)) {
        return { valid: false, error: 'Invalid attendance records format' };
      }

      // Validate each attendance record
      for (const record of backup.data.attendanceRecords) {
        if (!record.id || !record.prefectNumber || !record.role || !record.timestamp || !record.date) {
          return { valid: false, error: 'Invalid attendance record structure' };
        }
      }

      return { valid: true, data: backup };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to parse backup file' 
      };
    }
  }

  static importBackup(backupString: string): { success: boolean; error?: string; imported?: number } {
    try {
      const validation = this.validateBackup(backupString);
      
      if (!validation.valid || !validation.data) {
        return { success: false, error: validation.error };
      }

      const backup = validation.data;

      // Store the data
      const success = StorageManager.setItem('ATTENDANCE_RECORDS', backup.data.attendanceRecords);
      
      if (!success) {
        return { success: false, error: 'Failed to save attendance records to storage' };
      }

      // Optionally restore other data
      if (backup.data.backupHistory) {
        StorageManager.setItem('BACKUP_HISTORY', backup.data.backupHistory);
      }
      
      if (backup.data.scanHistory) {
        StorageManager.setItem('SCAN_HISTORY', backup.data.scanHistory);
      }
      
      if (backup.data.lastExportDate) {
        StorageManager.setItem('LAST_EXPORT_DATE', backup.data.lastExportDate);
      }

      return { 
        success: true, 
        imported: backup.data.attendanceRecords.length 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during backup import' 
      };
    }
  }

  static downloadBackup(): void {
    const result = this.exportBackup();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create backup');
    }

    const blob = new Blob([result.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `mrcm-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static getBackupHistory(): BackupHistoryEntry[] {
    return StorageManager.getItem('BACKUP_HISTORY', []);
  }

  static clearBackupHistory(): boolean {
    return StorageManager.setItem('BACKUP_HISTORY', []);
  }
}