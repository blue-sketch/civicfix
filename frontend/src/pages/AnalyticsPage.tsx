import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Layers,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

const COLORS = ['#3158D8', '#0F9D8A', '#F59E0B', '#EF4444', '#8B5CF6', '#0284C7', '#10B981', '#6366F1'];

export const AnalyticsPage: React.FC = () => {
  const { data: overview } = useQuery({ queryKey: ['analytics_overview'], queryFn: api.getOverviewMetrics });
  const { data: categories = [] } = useQuery({ queryKey: ['analytics_categories'], queryFn: api.getCategoryMetrics });
  const { data: statuses = [] } = useQuery({ queryKey: ['analytics_statuses'], queryFn: api.getStatusMetrics });
  const { data: trends = [] } = useQuery({ queryKey: ['analytics_trends'], queryFn: () => api.getTrends(14) });
  const { data: wards = [] } = useQuery({ queryKey: ['analytics_wards'], queryFn: api.getWardMetrics });
  const { data: teams = [] } = useQuery({ queryKey: ['analytics_teams'], queryFn: api.getTeamMetrics });

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-accent mb-1">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Municipal Intelligence & SLA Compliance</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-navy-900">
          Executive Operations Analytics
        </h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Quantitative telemetry on grievance resolution, departmental throughput, and ward-level municipal efficiency.
        </p>
      </div>

      {/* Top SLA Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase">Average Resolution Time</span>
            <Clock className="w-4 h-4 text-teal-accent" />
          </div>
          <div className="text-2xl font-extrabold text-navy-900">{overview?.avg_resolution_hours ?? 0} Hours</div>
          <div className="text-[11px] text-text-muted mt-1">Median: {overview?.median_resolution_hours ?? 0}h</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase">City-Wide Resolution Rate</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-status-resolved">{overview?.resolution_rate_percent ?? 0}%</div>
          <div className="text-[11px] text-text-muted mt-1">Closed within standard SLA</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase">Overdue Grievances</span>
            <AlertTriangle className="w-4 h-4 text-status-critical" />
          </div>
          <div className="text-2xl font-extrabold text-status-critical">{overview?.overdue_issues ?? 0} Issues</div>
          <div className="text-[11px] text-text-muted mt-1">Older than 7 calendar days</div>
        </div>

        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase">Resolved This Month</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-extrabold text-navy-900">{overview?.resolved_this_month ?? 0} Tickets</div>
          <div className="text-[11px] text-text-muted mt-1">Current calendar billing cycle</div>
        </div>
      </div>

      {/* Main Charts: 14-day Area Trend & Team Performance Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-navy-900">14-Day Grievance Intake vs Closure</h2>
              <p className="text-[11px] text-text-muted">Daily volume comparison across Pune</p>
            </div>
            <Calendar className="w-4 h-4 text-text-muted" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3158D8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3158D8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F9D8A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0F9D8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#171B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="submitted" stroke="#3158D8" fillOpacity={1} fill="url(#colorSub)" name="New Reports" />
                <Area type="monotone" dataKey="resolved" stroke="#0F9D8A" fillOpacity={1} fill="url(#colorRes)" name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload Breakdown */}
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-navy-900">Departmental Team Workload</h2>
              <p className="text-[11px] text-text-muted">Active tasks vs completed assignments by unit</p>
            </div>
            <Users className="w-4 h-4 text-text-muted" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teams} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="team_name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#171B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="active_tasks" fill="#F59E0B" name="Active Tasks" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved_tasks" fill="#16A34A" name="Resolved Tasks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ward Comparison Table & Distribution */}
      <div className="bg-white rounded-panel border border-surface-border shadow-xs p-6 space-y-4">
        <div>
          <h2 className="font-bold text-sm text-navy-900">Ward Operational Throughput Matrix</h2>
          <p className="text-[11px] text-text-muted">Breakdown of administrative performance by geographic zone</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted/60 border-b border-surface-border text-[11px] font-bold text-text-muted uppercase">
                <th className="py-2.5 px-4">Ward Name</th>
                <th className="py-2.5 px-4">Total Received</th>
                <th className="py-2.5 px-4">Active Queue</th>
                <th className="py-2.5 px-4">Resolved</th>
                <th className="py-2.5 px-4">Clearance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {wards.map((w) => {
                const rate = w.total_count > 0 ? Math.round((w.resolved_count / w.total_count) * 100) : 0;
                return (
                  <tr key={w.ward_id} className="hover:bg-surface-muted/30">
                    <td className="py-3 px-4 font-bold text-navy-900">{w.ward_name}</td>
                    <td className="py-3 px-4 font-medium text-text-main">{w.total_count}</td>
                    <td className="py-3 px-4 text-status-medium font-semibold">{w.open_count}</td>
                    <td className="py-3 px-4 text-status-resolved font-semibold">{w.resolved_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-accent h-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-bold text-text-main">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
