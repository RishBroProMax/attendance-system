// Network utilities for checking online status
import { invoke } from '@tauri-apps/api/core';

export interface NetworkStatus {
    online: boolean;
    lastChecked: Date;
}

/**
 * Check if the device has internet connectivity
 */
export async function isOnline(): Promise<boolean> {
    try {
        // Try to check for updates endpoint first (most reliable)
        const response = await fetch('https://api.github.com/zen', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
        });
        return true;
    } catch (error) {
        // Fallback: check if we can reach any common endpoint
        try {
            const response = await fetch('https://www.google.com/gen_204', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
            });
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
    const online = await isOnline();
    return {
        online,
        lastChecked: new Date(),
    };
}

/**
 * Listen for online/offline events
 */
export function addNetworkListener(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * Wait for network to be online (with timeout)
 */
export async function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const online = await isOnline();
        if (online) return true;

        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
}
