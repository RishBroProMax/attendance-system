'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';
import { Badge } from './badge';
import { addStorageListener, getAttendanceRecords } from '@/lib/attendance';
import { AttendanceRecord } from '@/lib/types';

interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

export function RealTimeSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: true,
    lastSync: new Date(),
    pendingChanges: 0,
    syncInProgress: false,
  });
  const [recentChanges, setRecentChanges] = useState<AttendanceRecord[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Set up storage listener for real-time updates
    const unsubscribe = addStorageListener((records) => {
      // Simulate sync process
      setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
      
      // Get recent changes (last 5 records)
      const sortedRecords = records
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      
      setRecentChanges(sortedRecords);

      // Simulate sync completion after a short delay
      setTimeout(() => {
        setSyncStatus(prev => ({
          ...prev,
          syncInProgress: false,
          lastSync: new Date(),
          pendingChanges: 0,
        }));
      }, 500);
    });

    // Simulate connection status checks
    const connectionCheck = setInterval(() => {
      // In a real app, this would check actual network connectivity
      const isOnline = navigator.onLine;
      setSyncStatus(prev => ({ ...prev, isConnected: isOnline }));
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(connectionCheck);
    };
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="backdrop-blur-xl bg-background/90 border border-white/20 rounded-lg shadow-lg"
      >
        <div 
          className="p-3 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {syncStatus.syncInProgress ? (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              ) : syncStatus.isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              
              {/* Sync indicator pulse */}
              <AnimatePresence>
                {syncStatus.syncInProgress && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-blue-500"
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={syncStatus.isConnected ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {syncStatus.syncInProgress ? 'Syncing...' : 
                   syncStatus.isConnected ? 'Connected' : 'Offline'}
                </Badge>
                
                {syncStatus.pendingChanges > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {syncStatus.pendingChanges} pending
                  </Badge>
                )}
              </div>
              
              {syncStatus.lastSync && (
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(syncStatus.lastSync)}
                </span>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Real-time Sync</span>
              </div>

              {recentChanges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Recent Changes:</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recentChanges.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-2 text-xs p-2 rounded bg-background/50"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="font-medium">{record.prefectNumber}</span>
                        <span className="text-muted-foreground">({record.role})</span>
                        <span className="text-muted-foreground ml-auto">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Auto-sync enabled</span>
                </div>
                {syncStatus.isConnected ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}