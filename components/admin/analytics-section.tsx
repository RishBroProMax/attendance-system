'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, PieChart } from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { AttendanceRecord } from '@/lib/types';

interface AnalyticsSectionProps {
  records: AttendanceRecord[];
}

type TimeRange = '30min' | '1day' | '7day' | '1month' | '3month';

export function AnalyticsSection({ records }: AnalyticsSectionProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('7day');

  // Build intervals based on selected time range.
  const intervals = useMemo(() => {
    const now = new Date();
    let result: { label: string; start: Date; end: Date }[] = [];
    if (selectedRange === '30min') {
      // 30 intervals for the past 30 minutes.
      result = Array.from({ length: 30 }, (_, i) => {
        const minute = new Date(now.getTime() - (29 - i) * 60 * 1000);
        return {
          label: minute.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          start: new Date(minute),
          end: new Date(minute.getTime() + 59 * 1000) // almost one minute later
        };
      });
    } else if (selectedRange === '1day') {
      // 24 hourly intervals for today.
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      result = Array.from({ length: 24 }, (_, i) => {
        const start = new Date(today);
        start.setHours(i);
        const end = new Date(start);
        end.setHours(i + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        return {
          label: `${i}:00`,
          start,
          end,
        };
      });
    } else if (selectedRange === '7day') {
      // 7 daily intervals.
      result = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return {
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          start,
          end,
        };
      });
    } else if (selectedRange === '1month') {
      // Last 30 days.
      result = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (29 - i));
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return {
          label: date.toLocaleDateString(),
          start,
          end,
        };
      });
    } else if (selectedRange === '3month') {
      // Approximate grouping into 12 weeks for 3 months.
      result = Array.from({ length: 12 }, (_, i) => {
        const start = new Date(now);
        start.setDate(start.getDate() - (11 - i) * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return {
          label: `Week ${i + 1}`,
          start,
          end,
        };
      });
    }
    return result;
  }, [selectedRange]);

  // Compute analytics stats for each interval.
  const analyticsStats = useMemo(() => {
    return intervals.map(interval => {
      const intervalRecords = records.filter(record => {
        const ts = new Date(record.timestamp);
        return ts >= interval.start && ts <= interval.end;
      });
      const onTimeCount = intervalRecords.filter(record => {
        const ts = new Date(record.timestamp);
        return ts.getHours() < 7 || (ts.getHours() === 7 && ts.getMinutes() === 0);
      }).length;
      const avgCheckIn = intervalRecords.length
        ? Math.round(
            intervalRecords.reduce((sum, r) => {
              const ts = new Date(r.timestamp);
              return sum + ts.getHours() * 60 + ts.getMinutes();
            }, 0) / intervalRecords.length
          )
        : 0;
      return {
        label: interval.label,
        onTime: onTimeCount,
        late: intervalRecords.length - onTimeCount,
        avgCheckIn,
        total: intervalRecords.length,
      };
    });
  }, [records, intervals]);

  // Compute role distribution.
  const roleDistribution = useMemo(() => {
    const distribution = records.reduce((acc, record) => {
      acc[record.role] = (acc[record.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Compute overall summary metrics.
  const summaryMetrics = useMemo(() => {
    const totalRecords = records.length;
    const totalOnTime = records.filter(record => {
      const ts = new Date(record.timestamp);
      return ts.getHours() < 7 || (ts.getHours() === 7 && ts.getMinutes() === 0);
    }).length;
    const overallAvgCheckIn = totalRecords
      ? Math.round(
          records.reduce((sum, r) => {
            const ts = new Date(r.timestamp);
            return sum + ts.getHours() * 60 + ts.getMinutes();
          }, 0) / totalRecords
        )
      : 0;
    return { totalRecords, totalOnTime, overallAvgCheckIn };
  }, [records]);

  const COLORS = [
    '#10b981', // Green
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f87171', // Light Red
    '#fbbf24', // Light Yellow
    '#34d399', // Light Green
    '#60a5fa', // Light Blue
    '#a78bfa', // Light Purple
    '#f43f5e', // Dark Red
    '#f59e0b', // Dark Yellow
    '#059669', // Dark Green
    '#2563eb', // Dark Blue
    '#7c3aed'  // Dark Purple
  ];

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex gap-2 flex-wrap">
        {(['30min', '1day', '7day', '1month', '3month'] as TimeRange[]).map(range => (
          <Button
            key={range}
            variant={selectedRange === range ? "default" : "outline"}
            onClick={() => setSelectedRange(range)}
          >
            {range === '30min'
              ? '30 Min'
              : range === '1day'
              ? '1 Day'
              : range === '7day'
              ? '7 Day'
              : range === '1month'
              ? '1 Month'
              : '3 Month'}
          </Button>
        ))}
      </div>

      {/* Summary Metrics */}
      <Card className="bg-background shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Summary Metrics
          </CardTitle>
          <CardDescription>
            Total Records: {summaryMetrics.totalRecords} | On Time: {summaryMetrics.totalOnTime} | Overall Avg Check-In: {summaryMetrics.overallAvgCheckIn} min
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Attendance Trends Chart */}
      <Card className="bg-background shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Attendance Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] p-0">
          <ResponsiveContainer width="100%" height="100%" style={{ backgroundColor: '#000' }}>
            <RechartsLineChart data={analyticsStats}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#fff" }} />
              <YAxis tick={{ fill: "#fff" }} />
              <Tooltip contentStyle={{ backgroundColor: "#000", borderColor: "#fff", color: "#fff" }}/>
              <Legend wrapperStyle={{ color: "#fff" }}/>
              <Line type="monotone" dataKey="onTime" stroke="#10b981" name="On Time" />
              <Line type="monotone" dataKey="late" stroke="#ef4444" name="Late" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Average Check-In Time Chart */}
      <Card className="bg-background shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Average Check-In Time
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-0">
          <ResponsiveContainer width="100%" height="100%" style={{ backgroundColor: '#000' }}>
            <RechartsLineChart data={analyticsStats}>
              <CartesianGrid stroke="#444" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#fff" }} />
              <YAxis tick={{ fill: "#fff" }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: "#fff" }}/>
              <Tooltip contentStyle={{ backgroundColor: "#000", borderColor: "#fff", color: "#fff" }}/>
              <Legend wrapperStyle={{ color: "#fff" }}/>
              <Line type="monotone" dataKey="avgCheckIn" stroke="#fbbf24" name="Avg Check-In (min)" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Role Distribution Pie Chart */}
      <Card className="bg-background shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] p-0">
          <ResponsiveContainer width="100%" height="100%" style={{ backgroundColor: '#000' }}>
            <RechartsPieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {roleDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#000", borderColor: "#fff", color: "#fff" }}/>
              <Legend wrapperStyle={{ color: "#fff" }}/>
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Data Table with Interval Details */}
      <Card className="bg-background shadow">
        <CardHeader>
          <CardTitle>Interval Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interval</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>On Time</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Avg Check-In (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsStats.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell>{stat.label}</TableCell>
                  <TableCell>{stat.total}</TableCell>
                  <TableCell>{stat.onTime}</TableCell>
                  <TableCell>{stat.late}</TableCell>
                  <TableCell>{stat.avgCheckIn}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}