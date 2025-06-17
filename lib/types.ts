export type PrefectRole =
  | 'Head'
  | 'Deputy'
  | 'Senior Executive'
  | 'Executive'
  | 'Super Senior'
  | 'Senior'
  | 'Junior'
  | 'Sub'
  | 'Apprentice'
  | 'Games Captain';

export interface AttendanceRecord {
  id: string;
  prefectNumber: string;
  role: PrefectRole;
  timestamp: string;
  date: string;
}

export interface DailyStats {
  total: number;
  onTime: number;
  late: number;
  byRole: Record<PrefectRole, number>;
}