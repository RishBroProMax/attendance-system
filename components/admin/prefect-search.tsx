'use client';

import { useState } from 'react';
import {
  Search,
  Download,
  User as UserIcon,
  Calendar,
  Clock,
  TrendingUp,
  ChevronDown,
  Crown,
  UserCheck,
  Briefcase,
  Clipboard,
  Star,
  UserMinus,
  BookOpen,
  Gamepad,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend as ChartLegend,
} from 'chart.js';
import {
  searchPrefectRecords,
  exportPrefectReport,
} from '@/lib/attendance';
import { AttendanceRecord, PrefectRole } from '@/lib/types';

// Register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  ChartLegend
);

const VALID_ROLES: PrefectRole[] = [
  'Head',
  'Deputy',
  'Senior Executive',
  'Executive',
  'Super Senior',
  'Senior',
  'Junior',
  'Sub',
  'Apprentice',
  'Games Captain',
];

const roleIcons: Record<PrefectRole, JSX.Element> = {
  Head: <Crown className="h-4 w-4 text-white" />,
  Deputy: <UserCheck className="h-4 w-4 text-white" />,
  'Senior Executive': <Briefcase className="h-4 w-4 text-white" />,
  Executive: <Clipboard className="h-4 w-4 text-white" />,
  'Super Senior': <Star className="h-4 w-4 text-white" />,
  Senior: <UserIcon className="h-4 w-4 text-white" />,
  Junior: <UserIcon className="h-4 w-4 text-white" />,
  Sub: <UserMinus className="h-4 w-4 text-white" />,
  Apprentice: <BookOpen className="h-4 w-4 text-white" />,
  'Games Captain': <Gamepad className="h-4 w-4 text-white" />,
};

interface PrefectStats {
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  attendanceRate: number;
  roles: Record<PrefectRole, number>;
  recentRecords: AttendanceRecord[];
}

export function PrefectSearch() {
  const [prefectNumber, setPrefectNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<PrefectRole | ''>('');
  const [searchResults, setSearchResults] = useState<AttendanceRecord[]>([]);
  const [prefectStats, setPrefectStats] = useState<PrefectStats | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const computeStats = (records: AttendanceRecord[]): PrefectStats => {
    const stats: PrefectStats = {
      totalDays: records.length,
      onTimeDays: 0,
      lateDays: 0,
      attendanceRate: 0,
      roles: {
        Head: 0,
        Deputy: 0,
        'Senior Executive': 0,
        Executive: 0,
        'Super Senior': 0,
        Senior: 0,
        Junior: 0,
        Sub: 0,
        Apprentice: 0,
        'Games Captain': 0,
      },
      recentRecords: records.slice(0, 10),
    };

    records.forEach((record) => {
      const time = new Date(record.timestamp);
      // On time if before or at 7:00
      if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
        stats.onTimeDays++;
      } else {
        stats.lateDays++;
      }
      if (record.role in stats.roles) {
        stats.roles[record.role as PrefectRole]++;
      }
    });
    stats.attendanceRate = stats.totalDays > 0 ? (stats.onTimeDays / stats.totalDays) * 100 : 0;
    return stats;
  };

  const handleSearch = () => {
    if (!prefectNumber.trim() || !selectedRole) {
      toast.error('Please enter both the prefect ID and select a role for the search.');
      return;
    }
    setIsSearching(true);
    try {
      const allRecords = searchPrefectRecords(prefectNumber.trim());
      const filteredRecords = allRecords.filter(
        (record) => record.role.toLowerCase() === selectedRole.toLowerCase()
      );
      setSearchResults(filteredRecords);

      if (filteredRecords.length === 0) {
        toast.info('No Records Found', {
          description: `No attendance records found for prefect ${prefectNumber.trim()} with role "${selectedRole}".`,
        });
        setPrefectStats(null);
      } else {
        const stats = computeStats(filteredRecords);
        setPrefectStats(stats);
        toast.success('Search Complete', {
          description: `Found ${filteredRecords.length} attendance record${filteredRecords.length > 1 ? 's' : ''}.`,
        });
      }
    } catch (error) {
      toast.error('Search Failed', {
        description: 'An error occurred while searching for records',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportReport = () => {
    if (!prefectNumber.trim() || !selectedRole || !searchResults.length) {
      toast.error('No data to export');
      return;
    }
    try {
      const csv = exportPrefectReport(prefectNumber.trim());
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prefect_${selectedRole}_${prefectNumber.trim()}_report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Report Exported', {
        description: 'Prefect attendance report has been downloaded',
      });
    } catch (error) {
      toast.error('Export Failed', {
        description: 'Could not export the report',
      });
    }
  };

  const getStatusColor = (timestamp: string) => {
    const time = new Date(timestamp);
    if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
      return 'default';
    }
    return 'destructive';
  };

  const getStatusText = (timestamp: string) => {
    const time = new Date(timestamp);
    if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
      return 'On Time';
    }
    return 'Late';
  };

  // Analytics / Chart data
  const chartData = {
    labels: ['Total Days', 'On Time', 'Late'],
    datasets: [
      {
        label: 'Attendance Summary',
        data: prefectStats ? [prefectStats.totalDays, prefectStats.onTimeDays, prefectStats.lateDays] : [0, 0, 0],
        backgroundColor: ['#4f46e5', '#10b981', '#ef4444'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Prefect Attendance Overview' },
    },
  };

  // Pie Chart: Role Distribution
  const pieChartLabels = prefectStats ? (Object.keys(prefectStats.roles) as PrefectRole[]) : [];
  const pieChartData = {
    labels: pieChartLabels.filter((role) => (prefectStats?.roles[role] || 0) > 0),
    datasets: [
      {
        label: 'Role Distribution',
        data: pieChartLabels.filter((role) => (prefectStats?.roles[role] || 0) > 0)
          .map((role) => prefectStats?.roles[role] ?? 0),
        backgroundColor: [
          '#f87171',
          '#fbbf24',
          '#34d399',
          '#60a5fa',
          '#a78bfa',
          '#f472b6',
          '#34d399',
          '#60a5fa',
          '#f87171',
          '#fbbf24',
        ],
      },
    ],
  };

  // Line Chart: Daily On-Time Trend
  const dailyOnTimeCounts: Record<string, number> = {};
  searchResults.forEach((record) => {
    const dateKey = record.date; // expecting YYYY-MM-DD format
    const time = new Date(record.timestamp);
    if (time.getHours() < 7 || (time.getHours() === 7 && time.getMinutes() === 0)) {
      dailyOnTimeCounts[dateKey] = (dailyOnTimeCounts[dateKey] || 0) + 1;
    }
  });
  const sortedDates = Object.keys(dailyOnTimeCounts).sort();
  const lineChartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Daily On-Time Count',
        data: sortedDates.map((date) => dailyOnTimeCounts[date]),
        fill: false,
        borderColor: '#10b981',
        tension: 0.1,
      },
    ],
  };

  // Doughnut Chart: On Time vs Late
  const doughnutChartData = {
    labels: ['On Time', 'Late'],
    datasets: [
      {
        data: prefectStats ? [prefectStats.onTimeDays, prefectStats.lateDays] : [0, 0],
        backgroundColor: ['#10b981', '#ef4444'],
      },
    ],
  };

  // ---- FIX: Strict type for Doughnut options ----
  // Chart.js types for legend.position are not just 'string', but a stricter set.
  // So, use the union: "top" | "bottom" | "center" | "left" | "right" | "chartArea" | ...
  const doughnutChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const }, // Fix: use 'bottom' as const
      title: { display: true, text: 'On Time vs Late Distribution' },
    },
  };

  return (
    <div className="space-y-6 relative">
      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>About This Page</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This page allows admins to search for prefect attendance records. Here you can view detailed statistics, analytics charts (including attendance overview, role distributions, daily on time trends, and on time vs late distributions), and export reports.
              </p>
              <p>
                Use the search bar to enter a prefect ID and select a role. The analytics below provide insights into attendance behavior.
              </p>
            </CardContent>
            <div className="flex justify-end p-4">
              <Button onClick={() => setShowInfoModal(false)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header with Info Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Prefect Attendance Dashboard</h2>
        <Button onClick={() => setShowInfoModal(true)} className="flex items-center gap-2 bg-secondary/80 hover:bg-secondary">
          <Info className="h-5 w-5 text-white" />
          Info
        </Button>
      </div>

      {/* Search Card */}
      <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Search className="h-5 w-5 text-white" />
            Search Prefect Attendance Records
          </CardTitle>
          <CardDescription className="text-white">
            Enter the prefect ID and select a role to display specific attendance details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
              <Input
                type="text"
                placeholder="Enter prefect ID (e.g., 64)"
                value={prefectNumber}
                onChange={(e) => setPrefectNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-background/50 border-white/20 backdrop-blur-sm text-white"
              />
            </div>
            <div className="relative flex-1">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as PrefectRole)}
                className="w-full rounded-md border border-white/20 bg-background/50 text-white py-2 pl-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm appearance-none"
              >
                <option value="" disabled>
                  Select Role
                </option>
                {VALID_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white" />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} className="bg-primary/90 hover:bg-primary backdrop-blur-sm">
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      {prefectStats && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                  <Calendar className="h-4 w-4" />
                  Total Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{prefectStats.totalDays}</div>
                <p className="text-xs text-muted-foreground">Attendance records</p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4" />
                  On Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{prefectStats.onTimeDays}</div>
                <p className="text-xs text-muted-foreground">Days on time</p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4" />
                  Late
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{prefectStats.lateDays}</div>
                <p className="text-xs text-muted-foreground">Days late</p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                  <TrendingUp className="h-4 w-4" />
                  Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {prefectStats.attendanceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">On-time rate</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-6 backdrop-blur-sm bg-background/80 border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Attendance Chart</CardTitle>
              <CardDescription className="text-white">
                A bar chart representation of the total, on time, and late days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bar data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="mt-6 backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Role Distribution Chart</CardTitle>
                <CardDescription className="text-white">
                  A pie chart of role distribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' as const } } }} />
              </CardContent>
            </Card>
            <Card className="mt-6 backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Daily On-Time Trend</CardTitle>
                <CardDescription className="text-white">
                  A line chart showing on-time attendance counts per day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { position: 'top' as const } } }} />
              </CardContent>
            </Card>
            <Card className="mt-6 backdrop-blur-sm bg-background/80 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">On Time vs Late</CardTitle>
                <CardDescription className="text-white">
                  A doughnut chart showing the distribution between on time and late days.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="mt-6 backdrop-blur-sm bg-background/80 border border-white/10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <UserIcon className="h-5 w-5" />
                  Prefect {prefectNumber.trim()} ({selectedRole})
                </CardTitle>
                <CardDescription className="text-white">
                  {searchResults.length} record{searchResults.length !== 1 && 's'} found
                </CardDescription>
              </div>
              <Button onClick={handleExportReport} className="gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm">
                <Download className="h-4 w-4 text-white" />
                Export Full Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {searchResults.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-white/10 hover:bg-background/40 transition-colors"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{record.role}</span>
                      <Badge variant={getStatusColor(record.timestamp)}>
                        {getStatusText(record.timestamp)}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{record.date}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}