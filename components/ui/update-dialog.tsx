'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    RefreshCw,
    X,
    Check,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';
import { Button } from './button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './dialog';
import { toast } from 'sonner';
import { checkForUpdates, downloadAndInstall, type UpdateInfo, type UpdateProgress } from '@/lib/updater';
import { isOnline } from '@/lib/network';

interface UpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    updateInfo?: UpdateInfo;
}

export function UpdateDialog({ open, onOpenChange, updateInfo: initialUpdateInfo }: UpdateDialogProps) {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(initialUpdateInfo || null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckForUpdates = async () => {
        setIsChecking(true);
        setError(null);

        try {
            const online = await isOnline();
            if (!online) {
                setError('No internet connection. Please check your network and try again.');
                toast.error('Offline', {
                    description: 'Unable to check for updates without internet connection',
                });
                setIsChecking(false);
                return;
            }

            const info = await checkForUpdates();
            setUpdateInfo(info);

            if (info.available) {
                toast.success('Update Available', {
                    description: `Version ${info.latestVersion} is ready to install`,
                });
            } else {
                toast.info('Up to Date', {
                    description: 'You are running the latest version',
                });
                onOpenChange(false);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to check for updates';
            setError(message);
            toast.error('Update Check Failed', {
                description: message,
            });
        } finally {
            setIsChecking(false);
        }
    };

    const handleDownloadAndInstall = async () => {
        setIsDownloading(true);
        setError(null);
        setDownloadProgress({ downloaded: 0, total: 100, percentage: 0 });

        try {
            await downloadAndInstall((progress) => {
                setDownloadProgress(progress);
            });

            toast.success('Update Installed', {
                description: 'The application will restart now',
            });

            // The app will automatically relaunch after this
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to install update';
            setError(message);
            setIsDownloading(false);
            setDownloadProgress(null);
            toast.error('Installation Failed', {
                description: message,
            });
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/95 border border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Download className="h-5 w-5 text-primary" />
                        Software Update
                    </DialogTitle>
                    <DialogDescription>
                        {updateInfo?.available
                            ? 'A new version is available for download'
                            : 'Check for the latest software updates'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                        >
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-500">{error}</p>
                        </motion.div>
                    )}

                    {updateInfo?.available && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-white/10">
                                    <div className="text-xs text-muted-foreground mb-1">Current Version</div>
                                    <div className="font-mono font-semibold">{updateInfo.currentVersion}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
                                    <div className="text-xs text-muted-foreground mb-1">Latest Version</div>
                                    <div className="font-mono font-semibold text-primary">{updateInfo.latestVersion}</div>
                                </div>
                            </div>

                            {updateInfo.body && (
                                <div className="p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10">
                                    <div className="text-sm font-medium mb-2">What's New</div>
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                        {updateInfo.body}
                                    </div>
                                </div>
                            )}

                            {updateInfo.date && (
                                <div className="text-xs text-muted-foreground">
                                    Released: {new Date(updateInfo.date).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    )}

                    {isDownloading && downloadProgress && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Downloading update...</span>
                                <span className="font-mono">{downloadProgress.percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="bg-primary h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${downloadProgress.percentage}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatBytes(downloadProgress.downloaded)}</span>
                                <span>{formatBytes(downloadProgress.total)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center gap-2">
                    {!updateInfo?.available && !isDownloading && (
                        <Button
                            onClick={handleCheckForUpdates}
                            disabled={isChecking}
                            className="gap-2"
                        >
                            {isChecking ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" />
                                    Check for Updates
                                </>
                            )}
                        </Button>
                    )}

                    {updateInfo?.available && !isDownloading && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Later
                            </Button>
                            <Button
                                onClick={handleDownloadAndInstall}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download and Install
                            </Button>
                        </>
                    )}

                    {isDownloading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Installing update... Do not close the app
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook for managing update dialog state
 */
export function useUpdateDialog() {
    const [open, setOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

    const checkAndShow = async () => {
        try {
            const online = await isOnline();
            if (!online) {
                toast.error('Offline', {
                    description: 'Cannot check for updates without internet connection',
                });
                return;
            }

            const info = await checkForUpdates();
            if (info.available) {
                setUpdateInfo(info);
                setOpen(true);
            } else {
                toast.info('Up to Date', {
                    description: 'You are running the latest version',
                });
            }
        } catch (error) {
            toast.error('Update Check Failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    return {
        open,
        setOpen,
        updateInfo,
        checkAndShow,
    };
}
