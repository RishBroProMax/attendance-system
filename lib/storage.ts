// Centralized storage management with standardized keys and error handling
export class StorageManager {
  private static readonly KEYS = {
    ATTENDANCE_RECORDS: 'mrcm_attendance_records',
    BACKUP_STATUS: 'mrcm_backup_status',
    BACKUP_HISTORY: 'mrcm_backup_history',
    SCAN_HISTORY: 'mrcm_scan_history',
    ADMIN_FAILED_ATTEMPTS: 'mrcm_admin_failed_attempts',
    ADMIN_LOCKOUT_TIME: 'mrcm_admin_lockout_time',
    LAST_EXPORT_DATE: 'mrcm_last_export_date',
    SYSTEM_VERSION: 'mrcm_system_version'
  } as const;

  private static readonly CURRENT_VERSION = '6.0.4';

  static getStorageKey(key: keyof typeof StorageManager.KEYS): string {
    return StorageManager.KEYS[key];
  }

  static setItem<T>(key: keyof typeof StorageManager.KEYS, value: T): boolean {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: new Date().toISOString(),
        version: StorageManager.CURRENT_VERSION
      });
      localStorage.setItem(StorageManager.KEYS[key], serializedValue);
      return true;
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error);
      return false;
    }
  }

  static getItem<T>(key: keyof typeof StorageManager.KEYS, defaultValue: T): T {
    try {
      const item = localStorage.getItem(StorageManager.KEYS[key]);
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);
      
      // Handle legacy data format
      if (parsed.data !== undefined) {
        return parsed.data;
      }
      
      // Legacy format - return as is
      return parsed;
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  static removeItem(key: keyof typeof StorageManager.KEYS): boolean {
    try {
      localStorage.removeItem(StorageManager.KEYS[key]);
      return true;
    } catch (error) {
      console.error(`Failed to remove from localStorage (${key}):`, error);
      return false;
    }
  }

  static clearAll(): boolean {
    try {
      Object.values(StorageManager.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  static getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
  } {
    try {
      let used = 0;
      Object.values(StorageManager.KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += new Blob([item]).size;
        }
      });

      // Estimate available space (most browsers have ~5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB
      const percentage = (used / estimated) * 100;

      return {
        used,
        available: estimated - used,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  static migrateData(): void {
    try {
      // Migrate old attendance records
      const oldRecords = localStorage.getItem('prefect_attendance_records');
      if (oldRecords && !localStorage.getItem(StorageManager.KEYS.ATTENDANCE_RECORDS)) {
        localStorage.setItem(StorageManager.KEYS.ATTENDANCE_RECORDS, oldRecords);
        localStorage.removeItem('prefect_attendance_records');
      }

      // Migrate other old keys
      const migrations = [
        { old: 'backup_status', new: 'BACKUP_STATUS' },
        { old: 'backup_history', new: 'BACKUP_HISTORY' },
        { old: 'scan_history', new: 'SCAN_HISTORY' },
        { old: 'admin_failed_attempts', new: 'ADMIN_FAILED_ATTEMPTS' },
        { old: 'admin_lockout_time', new: 'ADMIN_LOCKOUT_TIME' },
        { old: 'last_export_date', new: 'LAST_EXPORT_DATE' }
      ];

      migrations.forEach(({ old, new: newKey }) => {
        const oldData = localStorage.getItem(old);
        if (oldData && !localStorage.getItem(StorageManager.KEYS[newKey as keyof typeof StorageManager.KEYS])) {
          localStorage.setItem(StorageManager.KEYS[newKey as keyof typeof StorageManager.KEYS], oldData);
          localStorage.removeItem(old);
        }
      });

      // Set version
      StorageManager.setItem('SYSTEM_VERSION', StorageManager.CURRENT_VERSION);
    } catch (error) {
      console.error('Failed to migrate data:', error);
    }
  }
}

// Initialize migration on module load
if (typeof window !== 'undefined') {
  StorageManager.migrateData();
}