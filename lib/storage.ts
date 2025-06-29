'use client';

import { AttendanceRecord, DailyStats, PrefectRole } from './types';

// Storage configuration
const STORAGE_KEYS = {
  ATTENDANCE_RECORDS: 'prefect_attendance_records',
  BACKUP_METADATA: 'attendance_backup_metadata',
  STORAGE_VERSION: 'attendance_storage_version',
  LAST_BACKUP: 'last_automatic_backup',
  DATA_INTEGRITY_HASH: 'data_integrity_hash',
  STORAGE_QUOTA_WARNING: 'storage_quota_warning',
} as const;

const STORAGE_VERSION = '2.0.0';
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (safe limit for localStorage)
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const INTEGRITY_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

// Storage event listeners for real-time sync
const storageListeners = new Set<(records: AttendanceRecord[]) => void>();

// Storage manager class
export class AttendanceStorageManager {
  private static instance: AttendanceStorageManager;
  private integrityCheckInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeStorage();
    this.setupStorageListeners();
    this.startPeriodicTasks();
  }

  public static getInstance(): AttendanceStorageManager {
    if (!AttendanceStorageManager.instance) {
      AttendanceStorageManager.instance = new AttendanceStorageManager();
    }
    return AttendanceStorageManager.instance;
  }

  private initializeStorage(): void {
    try {
      // Check and migrate storage version if needed
      const currentVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
      if (!currentVersion || currentVersion !== STORAGE_VERSION) {
        this.migrateStorage(currentVersion);
        localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STORAGE_VERSION);
      }

      // Initialize empty records if none exist
      if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS)) {
        this.saveRecords([]);
      }

      // Verify data integrity
      this.verifyDataIntegrity();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      this.handleStorageError(error);
    }
  }

  private setupStorageListeners(): void {
    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.ATTENDANCE_RECORDS && event.newValue) {
        try {
          const records = JSON.parse(event.newValue);
          this.notifyListeners(records);
        } catch (error) {
          console.error('Failed to parse storage event data:', error);
        }
      }
    });

    // Listen for beforeunload to ensure data is saved
    window.addEventListener('beforeunload', () => {
      this.performEmergencyBackup();
    });
  }

  private startPeriodicTasks(): void {
    // Periodic integrity checks
    this.integrityCheckInterval = setInterval(() => {
      this.verifyDataIntegrity();
    }, INTEGRITY_CHECK_INTERVAL);

    // Automatic backups
    this.backupInterval = setInterval(() => {
      this.performAutomaticBackup();
    }, BACKUP_INTERVAL);

    // Initial backup check
    this.checkAndPerformBackup();
  }

  private migrateStorage(oldVersion: string | null): void {
    try {
      console.log(`Migrating storage from ${oldVersion || 'unknown'} to ${STORAGE_VERSION}`);
      
      // Handle migration logic here
      const existingRecords = this.getRecords();
      
      // Add any new fields or transform data structure
      const migratedRecords = existingRecords.map(record => ({
        ...record,
        // Add any new fields with defaults
        migrated: true,
        version: STORAGE_VERSION,
      }));

      this.saveRecords(migratedRecords);
      console.log('Storage migration completed successfully');
    } catch (error) {
      console.error('Storage migration failed:', error);
      throw new Error('Failed to migrate storage data');
    }
  }

  private generateDataHash(data: AttendanceRecord[]): string {
    const dataString = JSON.stringify(data.sort((a, b) => a.id.localeCompare(b.id)));
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private verifyDataIntegrity(): boolean {
    try {
      const records = this.getRecords();
      const currentHash = this.generateDataHash(records);
      const storedHash = localStorage.getItem(STORAGE_KEYS.DATA_INTEGRITY_HASH);

      if (storedHash && storedHash !== currentHash) {
        console.warn('Data integrity check failed - attempting recovery');
        return this.attemptDataRecovery();
      }

      localStorage.setItem(STORAGE_KEYS.DATA_INTEGRITY_HASH, currentHash);
      return true;
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return false;
    }
  }

  private attemptDataRecovery(): boolean {
    try {
      // Try to recover from backup
      const backupData = this.getLatestBackup();
      if (backupData) {
        console.log('Recovering data from backup');
        this.saveRecords(backupData.records);
        return true;
      }

      // If no backup available, validate and clean current data
      const records = this.getRecords();
      const validRecords = records.filter(record => 
        record.id && record.prefectNumber && record.role && record.timestamp
      );

      if (validRecords.length !== records.length) {
        console.log(`Cleaned ${records.length - validRecords.length} invalid records`);
        this.saveRecords(validRecords);
      }

      return true;
    } catch (error) {
      console.error('Data recovery failed:', error);
      return false;
    }
  }

  private checkStorageQuota(): { available: number; used: number; percentage: number } {
    try {
      const testKey = 'storage_quota_test';
      const testData = 'x'.repeat(1024); // 1KB test
      let used = 0;

      // Calculate current usage
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Test available space
      let available = 0;
      try {
        for (let i = 0; i < 1024; i++) {
          localStorage.setItem(testKey + i, testData);
          available += testData.length;
        }
      } catch (e) {
        // Storage full
      } finally {
        // Clean up test data
        for (let i = 0; i < 1024; i++) {
          localStorage.removeItem(testKey + i);
        }
      }

      const total = used + available;
      const percentage = (used / total) * 100;

      return { available, used, percentage };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return { available: 0, used: 0, percentage: 100 };
    }
  }

  private handleStorageError(error: any): void {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('Storage quota exceeded');
      this.handleQuotaExceeded();
    } else {
      console.error('Storage error:', error);
      // Attempt to recover from backup
      this.attemptDataRecovery();
    }
  }

  private handleQuotaExceeded(): void {
    try {
      // Remove old backup data first
      this.cleanOldBackups();

      // If still over quota, remove oldest records
      const records = this.getRecords();
      if (records.length > 1000) {
        const sortedRecords = records.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const recentRecords = sortedRecords.slice(0, 800); // Keep most recent 800
        this.saveRecords(recentRecords);
        
        console.log(`Removed ${records.length - recentRecords.length} old records due to storage limit`);
      }

      // Show warning to user
      localStorage.setItem(STORAGE_KEYS.STORAGE_QUOTA_WARNING, Date.now().toString());
    } catch (error) {
      console.error('Failed to handle quota exceeded:', error);
    }
  }

  private cleanOldBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('attendance_backup_')
      );

      // Sort by timestamp and keep only the 5 most recent
      const sortedBackups = backupKeys
        .map(key => ({
          key,
          timestamp: parseInt(key.split('_').pop() || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Remove old backups
      sortedBackups.slice(5).forEach(backup => {
        localStorage.removeItem(backup.key);
      });
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  public getRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
      if (!data) return [];

      const records = JSON.parse(data);
      
      // Validate record structure
      if (!Array.isArray(records)) {
        console.error('Invalid records format, resetting to empty array');
        return [];
      }

      return records.filter(record => 
        record && 
        typeof record === 'object' && 
        record.id && 
        record.prefectNumber && 
        record.role && 
        record.timestamp
      );
    } catch (error) {
      console.error('Failed to get records:', error);
      this.handleStorageError(error);
      return [];
    }
  }

  public saveRecords(records: AttendanceRecord[]): void {
    try {
      // Validate input
      if (!Array.isArray(records)) {
        throw new Error('Records must be an array');
      }

      // Check storage quota before saving
      const quota = this.checkStorageQuota();
      if (quota.percentage > 90) {
        console.warn('Storage quota nearly exceeded:', quota);
        this.handleQuotaExceeded();
      }

      const dataString = JSON.stringify(records);
      
      // Check if data size is reasonable
      if (dataString.length > MAX_STORAGE_SIZE) {
        throw new Error('Data size exceeds maximum storage limit');
      }

      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, dataString);
      
      // Update integrity hash
      const hash = this.generateDataHash(records);
      localStorage.setItem(STORAGE_KEYS.DATA_INTEGRITY_HASH, hash);

      // Notify listeners
      this.notifyListeners(records);

      // Update backup metadata
      this.updateBackupMetadata();
    } catch (error) {
      console.error('Failed to save records:', error);
      this.handleStorageError(error);
      throw error;
    }
  }

  public addRecord(record: AttendanceRecord): void {
    const records = this.getRecords();
    records.push(record);
    this.saveRecords(records);
  }

  public updateRecord(id: string, updates: Partial<AttendanceRecord>): AttendanceRecord {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error('Record not found');
    }

    const updatedRecord = { ...records[index], ...updates };
    records[index] = updatedRecord;
    this.saveRecords(records);
    
    return updatedRecord;
  }

  public deleteRecord(id: string): void {
    const records = this.getRecords();
    const filteredRecords = records.filter(r => r.id !== id);
    this.saveRecords(filteredRecords);
  }

  private updateBackupMetadata(): void {
    try {
      const metadata = {
        lastUpdate: Date.now(),
        recordCount: this.getRecords().length,
        version: STORAGE_VERSION,
      };
      localStorage.setItem(STORAGE_KEYS.BACKUP_METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to update backup metadata:', error);
    }
  }

  private checkAndPerformBackup(): void {
    try {
      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      const lastBackupTime = lastBackup ? parseInt(lastBackup) : 0;
      const now = Date.now();

      if (now - lastBackupTime > BACKUP_INTERVAL) {
        this.performAutomaticBackup();
      }
    } catch (error) {
      console.error('Failed to check backup schedule:', error);
    }
  }

  private performAutomaticBackup(): void {
    try {
      const records = this.getRecords();
      const timestamp = Date.now();
      const backupKey = `attendance_backup_${timestamp}`;
      
      const backupData = {
        timestamp,
        version: STORAGE_VERSION,
        records,
        metadata: {
          recordCount: records.length,
          createdAt: new Date().toISOString(),
        },
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp.toString());

      // Clean old backups to save space
      this.cleanOldBackups();

      console.log('Automatic backup completed:', backupKey);
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  }

  private performEmergencyBackup(): void {
    try {
      const records = this.getRecords();
      const emergencyBackup = {
        timestamp: Date.now(),
        records,
        emergency: true,
      };
      
      sessionStorage.setItem('emergency_backup', JSON.stringify(emergencyBackup));
    } catch (error) {
      console.error('Emergency backup failed:', error);
    }
  }

  public createManualBackup(): string {
    try {
      const records = this.getRecords();
      const timestamp = Date.now();
      
      const backupData = {
        timestamp,
        version: STORAGE_VERSION,
        records,
        metadata: {
          recordCount: records.length,
          createdAt: new Date().toISOString(),
          type: 'manual',
        },
      };

      const backupString = JSON.stringify(backupData, null, 2);
      
      // Also save to localStorage
      const backupKey = `attendance_backup_manual_${timestamp}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      return backupString;
    } catch (error) {
      console.error('Manual backup failed:', error);
      throw error;
    }
  }

  public restoreFromBackup(backupString: string): void {
    try {
      const backupData = JSON.parse(backupString);
      
      // Validate backup structure
      if (!backupData.records || !Array.isArray(backupData.records)) {
        throw new Error('Invalid backup format');
      }

      // Validate records
      const validRecords = backupData.records.filter((record: any) => 
        record && record.id && record.prefectNumber && record.role && record.timestamp
      );

      if (validRecords.length !== backupData.records.length) {
        console.warn(`Filtered out ${backupData.records.length - validRecords.length} invalid records during restore`);
      }

      this.saveRecords(validRecords);
      console.log(`Restored ${validRecords.length} records from backup`);
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }

  private getLatestBackup(): { timestamp: number; records: AttendanceRecord[] } | null {
    try {
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('attendance_backup_')
      );

      if (backupKeys.length === 0) return null;

      // Find the most recent backup
      const latestBackupKey = backupKeys
        .map(key => ({
          key,
          timestamp: parseInt(key.split('_').pop() || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const backupData = JSON.parse(localStorage.getItem(latestBackupKey.key) || '{}');
      return {
        timestamp: backupData.timestamp,
        records: backupData.records || [],
      };
    } catch (error) {
      console.error('Failed to get latest backup:', error);
      return null;
    }
  }

  public getStorageInfo(): {
    quota: { available: number; used: number; percentage: number };
    recordCount: number;
    lastBackup: string | null;
    version: string;
    integrity: boolean;
  } {
    const quota = this.checkStorageQuota();
    const records = this.getRecords();
    const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    const integrity = this.verifyDataIntegrity();

    return {
      quota,
      recordCount: records.length,
      lastBackup: lastBackup ? new Date(parseInt(lastBackup)).toISOString() : null,
      version: STORAGE_VERSION,
      integrity,
    };
  }

  public addStorageListener(callback: (records: AttendanceRecord[]) => void): () => void {
    storageListeners.add(callback);
    return () => storageListeners.delete(callback);
  }

  private notifyListeners(records: AttendanceRecord[]): void {
    storageListeners.forEach(callback => {
      try {
        callback(records);
      } catch (error) {
        console.error('Storage listener error:', error);
      }
    });
  }

  public cleanup(): void {
    if (this.integrityCheckInterval) {
      clearInterval(this.integrityCheckInterval);
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    storageListeners.clear();
  }
}

// Export singleton instance
export const storageManager = AttendanceStorageManager.getInstance();

// Utility functions for backward compatibility
export function getAttendanceRecords(): AttendanceRecord[] {
  return storageManager.getRecords();
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  storageManager.saveRecords(records);
}

export function addAttendanceRecord(record: AttendanceRecord): void {
  storageManager.addRecord(record);
}

export function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): AttendanceRecord {
  return storageManager.updateRecord(id, updates);
}

export function deleteAttendanceRecord(id: string): void {
  storageManager.deleteRecord(id);
}