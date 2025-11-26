'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { toast } from 'sonner';
import { getStorageInfo, createBackup, restoreFromBackup, addStorageListener } from '@/lib/attendance';

interface StorageInfo {
  quota: { available: number; used: number; percentage: number };
  recordCount: number;
  lastBackup: string | null;
  version: string;
  integrity: boolean;
}

export function StorageMonitor() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const refreshStorageInfo = async () => {
    setIsRefreshing(true);
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to get storage info:', error);
      toast.error('Failed to refresh storage information');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStorageInfo();

    const unsubscribe = addStorageListener(() => {
      refreshStorageInfo();
    });

    const interval = setInterval(refreshStorageInfo, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const backupData = await createBackup();
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup Created', {
        description: 'Attendance data has been backed up successfully',
      });

      refreshStorageInfo();
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup Failed', {
        description: 'Failed to create backup. Please try again.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      restoreFromBackup(text);

      toast.success('Restore Complete', {
        description: 'Attendance data has been restored successfully',
      });

      refreshStorageInfo();
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Restore Failed', {
        description: 'Failed to restore backup. Please check the file format.',
      });
    } finally {
      setIsRestoring(false);
      event.target.value = '';
    }
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!storageInfo) {
    return (
      <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading storage information...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={storageInfo.integrity ? 'default' : 'destructive'}>
              {storageInfo.integrity ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Issues
                </>
              )}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStorageInfo}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="font-medium">Storage Usage</span>
            </div>
            <span className={`text-sm font-mono ${getQuotaColor(storageInfo.quota.percentage)}`}>
              {storageInfo.quota.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${storageInfo.quota.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(storageInfo.quota.used)} used</span>
            <span>{formatBytes(storageInfo.quota.available)} available</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Records</span>
            </div>
            <p className="text-lg font-bold">{storageInfo.recordCount.toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last Backup</span>
            </div>
            <p className="text-sm">
              {storageInfo.lastBackup
                ? new Date(storageInfo.lastBackup).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="gap-2"
            size="sm"
          >
            {isBackingUp ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isBackingUp ? 'Creating...' : 'Backup'}
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isRestoring}
            />
            <Button
              variant="outline"
              disabled={isRestoring}
              className="gap-2"
              size="sm"
            >
              {isRestoring ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        <AnimatePresence>
          {storageInfo.quota.percentage > 90 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-500 mb-1">Storage Almost Full</h4>
                  <p className="text-sm text-muted-foreground">
                    Your storage is {storageInfo.quota.percentage.toFixed(1)}% full.
                    Consider creating a backup and clearing old records.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!storageInfo.integrity && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
            >
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-500 mb-1">Data Integrity Issue</h4>
                  <p className="text-sm text-muted-foreground">
                    Data integrity check failed. The system will attempt automatic recovery.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t border-white/10"
            >
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Technical Details
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Version:</span>
                  <span className="font-mono">{storageInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Integrity:</span>
                  <Badge variant={storageInfo.integrity ? 'default' : 'destructive'} className="text-xs">
                    {storageInfo.integrity ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used Space:</span>
                  <span className="font-mono">{formatBytes(storageInfo.quota.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Space:</span>
                  <span className="font-mono">{formatBytes(storageInfo.quota.available)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}