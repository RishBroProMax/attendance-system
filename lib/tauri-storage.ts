import { invoke } from '@tauri-apps/api/tauri';
import { AttendanceRecord, PrefectRole } from './types';

export interface Member {
    id: string;
    name: string | null;
    role: string;
    prefect_number: string;
}

export const tauriStorage = {
    async markAttendance(prefectNumber: string, role: string): Promise<AttendanceRecord> {
        return invoke('mark_attendance', { prefectNumber, role });
    },

    async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
        return invoke('get_attendance_by_date', { date });
    },

    async getAllAttendance(): Promise<AttendanceRecord[]> {
        return invoke('get_all_attendance');
    },

    async getMemberList(): Promise<Member[]> {
        return invoke('get_member_list');
    },

    async createMember(prefectNumber: string, role: string, name?: string): Promise<string> {
        return invoke('create_member', { prefectNumber, role, name });
    },

    async updateMember(id: string, updates: { prefectNumber?: string; role?: string; name?: string }): Promise<void> {
        return invoke('update_member', {
            id,
            prefectNumber: updates.prefectNumber,
            role: updates.role,
            name: updates.name
        });
    },

    async deleteMember(id: string): Promise<void> {
        return invoke('delete_member', { id });
    },

    async exportBackup(): Promise<string> {
        return invoke('export_backup');
    },

    async importBackup(backupData: string): Promise<void> {
        return invoke('import_backup', { backupData });
    },

    async wipeAllData(): Promise<void> {
        return invoke('wipe_all_data');
    },

    async getAppVersion(): Promise<string> {
        return invoke('get_app_version');
    },

    async checkForUpdates(): Promise<boolean> {
        return invoke('check_for_updates');
    }
};
