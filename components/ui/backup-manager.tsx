'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Upload, 
  Shield, 
  Clock, 
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  FileText,
  HardDrive,
  Trash2
} from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import { toast } from 'sonner';
import { getAttendanceRecords } from '@/lib/attendance';
import { BackupManager, BackupHistoryEntry } from '@/lib/backup';
import { StorageManager } from '@/lib/storage';

interface BackupStatus {
  lastBackup: Date | null;
  autoBackupEnabled: boolean;
  backupSize: string;
  version: string;
}

export function BackupManager() {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    lastBackup: null,
    autoBackupEnabled: false,
    backupSize: '0 KB',
    version: '6.0.4'
  });
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, available: 0, percentage: 0 });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateStorageInfo = useCallback(() => {
    const info = StorageManager.getStorageInfo();
    setStorageInfo(info);
    
    const records = getAttendanceRecords();
    const size = new Blob([JSON.stringify(records)]).size;
    setBackupStatus(prev => ({
      ...prev,
      backupSize: formatBytes(size)
    }));
  }, []);

  const loadBackupHistory = useCallback(() => {
    const history = BackupManager.getBackupHistory();
    setBackupHistory(history);
    
    if (history.length > 0) {
      setBackupStatus(prev => ({
        ...prev,
        lastBackup: new Date(history[0].timestamp)
      }));
    }
  }, []);

  useEffect(() => {
    updateStorageInfo();
    loadBackupHistory();
    
    // Update storage info periodically
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, [updateStorageInfo, loadBackupHistory]);

  const exportBackup = async () => {
    setIsExporting(true);
    try {
      BackupManager.downloadBackup();
      
      toast.success('Backup exported successfully', {
        description: 'Your data has been exported securely as a JSON file.',
        duration: 4000,
      });
      
      // Refresh backup history
      loadBackupHistory();
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Failed to create backup. Please try again.',
        duration: 4000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const backupString = await file.text();
      const result = BackupManager.importBackup(backupString);
      
      if (result.success) {
        toast.success('Backup imported successfully', {
          description: `Restored ${result.imported} attendance records.`,
          duration: 4000,
        });
        
        // Refresh data
        updateStorageInfo();
        loadBackupHistory();
        
        // Reload page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Import failed', {
          description: result.error || 'Failed to import backup file.',
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Failed to process backup file.',
        duration: 4000,
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const clearBackupHistory = () => {
    BackupManager.clearBackupHistory();
    setBackupHistory([]);
    toast.success('Backup history cleared', {
      description: 'All backup history entries have been removed.',
    });
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      StorageManager.clearAll();
      toast.success('All data cleared', {
        description: 'All attendance data and settings have been cleared.',
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Backup & Storage Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Overview */}
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
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage Used</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.used + storageInfo.available)}
                </p>
                <Progress value={storageInfo.percentage} className="h-2" />
              </div>
            </div>
          </div>

          {/* Backup Actions */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={exportBackup}
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
                  accept=".json"
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
                onClick={clearBackupHistory}
                className="gap-2"
                disabled={backupHistory.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>

              <Button
                variant="destructive"
                onClick={clearAllData}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Clear All Data
              </Button>
            </div>

            {/* Backup History */}
            {backupHistory.length > 0 && (
              <Card className="bg-background/30 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Backup History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {backupHistory.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex justify-between items-center p-3 rounded-lg bg-background/20 border border-white/5"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.recordCount} records • {formatBytes(entry.size)}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-white/20">
                          v{entry.version}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Notice */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-500 mb-1">Secure Local Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    All data is stored locally in your browser. Backup files are in JSON format for easy portability and verification.
                    Regular backups are recommended to prevent data loss.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}