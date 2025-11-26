'use client';

import { useEffect } from 'react';
import { checkForUpdatesOnStartup } from '@/lib/updater';
import { useUpdateDialog, UpdateDialog } from '@/components/ui/update-dialog';

export function UpdateChecker() {
    const { open, setOpen, updateInfo, checkAndShow } = useUpdateDialog();

    useEffect(() => {
        // Check for updates on app startup (after 3 seconds delay)
        const timer = setTimeout(async () => {
            try {
                const update = await checkForUpdatesOnStartup();
                if (update) {
                    await checkAndShow();
                }
            } catch (error) {
                console.error('Startup update check failed:', error);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [checkAndShow]);

    return <UpdateDialog open={open} onOpenChange={setOpen} updateInfo={updateInfo || undefined} />;
}
