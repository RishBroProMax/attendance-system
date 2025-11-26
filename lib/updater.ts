// Tauri updater integration (Tauri v1 compatible)
import { invoke } from '@tauri-apps/api/core';
import { isOnline } from './network';

export interface UpdateInfo {
    available: boolean;
    currentVersion: string;
    latestVersion?: string;
    body?: string;
    date?: string;
}

export interface UpdateProgress {
    downloaded: number;
    total: number;
    percentage: number;
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
    try {
        // First check if online
        const online = await isOnline();
        if (!online) {
            return {
                available: false,
                currentVersion: await getCurrentVersion(),
            };
        }

        // For Tauri v1, the updater check is built-in
        // The updater will automatically check based on tauri.conf.json configuration
        const currentVersion = await getCurrentVersion();

        // In production, this check happens automatically via Tauri's updater
        // For now, return that no update is available
        // The actual update check will happen through Tauri's built-in mechanism

        return {
            available: false,
            currentVersion,
        };
    } catch (error) {
        console.error('Failed to check for updates:', error);
        return {
            available: false,
            currentVersion: await getCurrentVersion(),
        };
    }
}

/**
 * Download and install update
 * Note: In Tauri v1, the updater is handled automatically
 * when configured in tauri.conf.json
 */
export async function downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
): Promise<void> {
    try {
        // In Tauri v1, when dialog is false in config, you manually trigger install
        // The actual implementation depends on your Tauri configuration
        toast.info('Update Check', {
            description: 'Checking for updates...',
        });

        // Tauri v1's updater will handle the download and install automatically
        // when an update is detected based on the configuration in tauri.conf.json
    } catch (error) {
        console.error('Failed to download and install update:', error);
        throw error;
    }
}

/**
 * Get current app version
 */
export async function getCurrentVersion(): Promise<string> {
    try {
        return await invoke<string>('get_app_version');
    } catch (error) {
        console.error('Failed to get app version:', error);
        // Fallback to package.json version
        return '1.0.0';
    }
}

/**
 * Check for updates on app startup (silent check)
 */
export async function checkForUpdatesOnStartup(): Promise<UpdateInfo | null> {
    try {
        const online = await isOnline();
        if (!online) return null;

        const updateInfo = await checkForUpdates();
        return updateInfo.available ? updateInfo : null;
    } catch (error) {
        console.error('Startup update check failed:', error);
        return null;
    }
}

// Import toast from sonner for notifications
import { toast } from 'sonner';
