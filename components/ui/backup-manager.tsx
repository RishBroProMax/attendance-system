'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Upload, 
  Shield, 
  Clock, 
  Wifi, 
  WifiOff, 
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  PlayCircle
} from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { toast } from 'sonner';
import { getAttendanceRecords } from '@/lib/attendance';

interface BackupStatus {
  lastBackup: Date | null;
  autoBackupEnabled: boolean;
  syncStatus: 'connected' | 'disconnected' | 'syncing';
  backupSize: string;
  version: number;
}

interface BackupHistoryEntry {
  timestamp: Date;
  version: number;
}

export function BackupManager() {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    lastBackup: null,
    autoBackupEnabled: false,
    syncStatus: 'disconnected',
    backupSize: '0 KB',
    version: 1
  });
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Load backup status and history on mount.
  useEffect(() => {
    const savedStatus = localStorage.getItem('backup_status');
    if (savedStatus) {
      const parsed = JSON.parse(savedStatus);
      setBackupStatus({
        ...parsed,
        lastBackup: parsed.lastBackup ? new Date(parsed.lastBackup) : null
      });
    }

    const records = getAttendanceRecords();
    const size = new Blob([JSON.stringify(records)]).size;
    setBackupStatus(prev => ({
      ...prev,
      backupSize: formatBytes(size)
    }));

    const savedHistory = localStorage.getItem('backup_history');
    if (savedHistory) {
      const history = JSON.parse(savedHistory).map((entry: any) => ({
        timestamp: new Date(entry.timestamp),
        version: entry.version
      }));
      setBackupHistory(history);
    }
  }, []);

  // Auto backup scheduler (demo: every 10 seconds)
  useEffect(() => {
    if (backupStatus.autoBackupEnabled) {
      const interval = setInterval(() => {
        exportBackup(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [backupStatus.autoBackupEnabled, backupStatus.version]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Simple XOR encryption (for demo only; in production use AES-256)
  const encryptData = async (data: string, password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const passwordBuffer = encoder.encode(password);
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ passwordBuffer[i % passwordBuffer.length];
    }
    return btoa(String.fromCharCode(...encrypted));
  };

  const decryptData = async (encryptedData: string, password: string): Promise<string> => {
    try {
      const encrypted = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
      const passwordBuffer = new TextEncoder().encode(password);
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ passwordBuffer[i % passwordBuffer.length];
      }
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt data. Invalid password or corrupted file.');
    }
  };

  // exportBackup accepts a flag to indicate whether it was triggered automatically (no prompt)
  const exportBackup = useCallback(async (isAuto = false) => {
    setIsExporting(true);
    try {
      const records = getAttendanceRecords();
      const backupData = {
        version: backupStatus.version,
        timestamp: new Date().toISOString(),
        records,
        metadata: {
          totalRecords: records.length,
          exportedBy: 'MRCM Attendance System',
          checksum: btoa(JSON.stringify(records)).slice(0, 16)
        }
      };

      let password: string | null = null;
      if (!isAuto) {
        password = prompt('Enter encryption password for backup:');
        if (!password) {
          setIsExporting(false);
          return;
        }
      } else {
        // For auto backups we use a default password (change this in production)
        password = 'default_autopass';
      }

      const encryptedData = await encryptData(JSON.stringify(backupData), password);
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mrcm-attendance-backup-${new Date().toISOString().split('T')[0]}.enc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update backup status and history
      const newVersion = backupStatus.version + 1;
      const newStatus: BackupStatus = {
        ...backupStatus,
        lastBackup: new Date(),
        version: newVersion
      };
      setBackupStatus(newStatus);
      localStorage.setItem('backup_status', JSON.stringify(newStatus));

      const newEntry: BackupHistoryEntry = {
        timestamp: new Date(),
        version: backupStatus.version
      };
      const newHistory = [newEntry, ...backupHistory];
      setBackupHistory(newHistory);
      localStorage.setItem('backup_history', JSON.stringify(newHistory));

      setLogs(prev => [`Backup exported at ${new Date().toLocaleString()}`, ...prev]);

      if (!isAuto) {
        toast.success('Backup exported successfully', {
          description: 'Your data has been encrypted and exported securely.'
        });
      }
    } catch (error) {
      toast.error('Export failed', {
        description: 'Failed to create backup. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [backupStatus, backupHistory]);

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const encryptedData = await file.text();
      const password = prompt('Enter decryption password:');
      if (!password) {
        setIsImporting(false);
        return;
      }
      const decryptedData = await decryptData(encryptedData, password);
      const backupData = JSON.parse(decryptedData);
      if (!backupData.records || !Array.isArray(backupData.records)) {
        throw new Error('Invalid backup file format');
      }
      const confirmImport = confirm(
        `This will replace your current data with ${backupData.records.length} records from ${new Date(backupData.timestamp).toLocaleString()}. Continue?`
      );
      if (confirmImport) {
        localStorage.setItem('prefect_attendance_records', JSON.stringify(backupData.records));
        setLogs(prev => [`Backup imported at ${new Date().toLocaleString()}`, ...prev]);
        toast.success('Backup imported successfully', {
          description: `Restored ${backupData.records.length} attendance records.`
        });
        window.location.reload();
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import backup.';
      toast.error('Import failed', {
        description: errorMessage
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const toggleAutoBackup = () => {
    const newStatus = {
      ...backupStatus,
      autoBackupEnabled: !backupStatus.autoBackupEnabled
    };
    setBackupStatus(newStatus);
    localStorage.setItem('backup_status', JSON.stringify(newStatus));
    toast.success(newStatus.autoBackupEnabled ? 'Auto-backup enabled' : 'Auto-backup disabled', {
      description: newStatus.autoBackupEnabled 
        ? 'Data will be automatically backed up every 10 seconds (demo mode)'
        : 'Automatic backups have been disabled'
    });
  };

  // New feature: Test sync changes status to "syncing" then "connected"
  const testSync = async () => {
    setBackupStatus(prev => ({ ...prev, syncStatus: 'syncing' }));
    toast('Syncing...', { description: 'Testing connection' });
    setTimeout(() => {
      setBackupStatus(prev => ({ ...prev, syncStatus: 'connected' }));
      toast.success('Sync successful', { description: 'Connection is now active.' });
    }, 2000);
  };

  return (
    <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Backup & Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last Backup</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {backupStatus.lastBackup 
                ? backupStatus.lastBackup.toLocaleString()
                : 'Never'
              }
            </p>
          </div>

          <div className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Data Size</span>
            </div>
            <p className="text-sm text-muted-foreground">{backupStatus.backupSize}</p>
          </div>

          <div className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              {backupStatus.syncStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">Sync Status</span>
            </div>
            <Badge variant={backupStatus.syncStatus === 'connected' ? 'default' : 'destructive'}>
              {backupStatus.syncStatus}
            </Badge>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => exportBackup()}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Backup'}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".enc"
                onChange={importBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isImporting}
              />
              <Button variant="outline" disabled={isImporting} className="gap-2">
                {isImporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? 'Importing...' : 'Import Backup'}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={toggleAutoBackup}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Auto-backup: {backupStatus.autoBackupEnabled ? 'ON' : 'OFF'}
            </Button>

            <Button onClick={testSync} className="gap-2" variant="outline">
              <PlayCircle className="h-4 w-4" />
              Test Sync
            </Button>
          </div>

          {/* Backup History */}
          {backupHistory.length > 0 && (
            <div className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
              <h4 className="font-medium mb-2">Backup History</h4>
              <ul className="space-y-1 max-h-28 overflow-y-auto text-sm">
                {backupHistory.map((entry, idx) => (
                  <li key={idx}>
                    Version {entry.version} - {entry.timestamp.toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-300">
              <h4 className="font-medium mb-2">Activity Logs</h4>
              <ul className="space-y-1 max-h-28 overflow-y-auto text-sm">
                {logs.map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-500 mb-1">Secure Encryption</h4>
                <p className="text-sm text-muted-foreground">
                  All backups are encrypted using a simple XOR (demo only). In production, use proper AES-256 encryption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}