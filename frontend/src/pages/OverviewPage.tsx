import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  MapPin,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Map as MapIcon,
  PlusCircle,
  ShieldAlert,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { CitizenOverview } from './CitizenOverview';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_COLORS: Record<string, string> = {
  POTHOLE: '#3158D8',
  WATERLOGGING: '#0284C7',
  WATER_LEAK: '#0EA5E9',
  GARBAGE: '#10B981',
  STREETLIGHT: '#F59E0B',
  FALLEN_TREE: '#14B8A6',
  ROAD_CRACK: '#6366F1',
  DAMAGED_INFRASTRUCTURE: '#EF4444',
  OTHER: '#8B5CF6'
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#94A3B8',
  VERIFIED: '#3B82F6',
  ASSIGNED: '#F59E0B',
  IN_PROGRESS: '#EA580C',
  RESOLVED: '#16A34A',
  CLOSED: '#475569',
  REOPENED: '#DC2626',
  REJECTED: '#EF4444'
};

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user?.role === 'CITIZEN') {
    return <CitizenOverview />;
  }

  if (user?.role === 'MUNICIPAL_OFFICER' && !user?.department_id) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 my-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-navy-900">No Department Assigned</h1>
        <p className="text-sm text-text-muted">
          No department assigned. Contact an administrator to be assigned to a department.
        </p>
      </div>
    );
  }

  const isPrivileged = user?.role === 'ADMIN' || (user?.role === 'MUNICIPAL_OFFICER' && !!user?.department_id);

  // Queries
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['analytics_overview', user?.department_id],
    queryFn: () => api.getOverviewMetrics(),
    enabled: isPrivileged,
  });

  const { data: categoryData = [] } = useQuery({
    queryKey: ['analytics_categories', user?.department_id],
    queryFn: () => api.getCategoryMetrics(),
    enabled: isPrivileged,
  });

  const { data: statusData = [] } = useQuery({
    queryKey: ['analytics_statuses', user?.department_id],
    queryFn: () => api.getStatusMetrics(),
    enabled: isPrivileged,
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['analytics_trends', user?.department_id],
    queryFn: () => api.getTrends(14),
    enabled: isPrivileged,
  });

  const { data: wardData = [] } = useQuery({
    queryKey: ['analytics_wards', user?.department_id],
    queryFn: () => api.getWardMetrics(),
    enabled: isPrivileged,
  });

  // Top 5 priority unresolved issues
  const { data: priorityQueueData } = useQuery({
    queryKey: ['priority_queue', user?.department_id],
    queryFn: () => api.listIssues({ page: 1, page_size: 5, sort_by: 'priority_score', sort_order: 'desc' }),
    enabled: isPrivileged,
  });

  const topPriorityIssues = priorityQueueData?.items.filter(
    (i) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(i.status)
  ) || [];

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-accent mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>{user?.role === 'MUNICIPAL_OFFICER' ? 'Department Telemetry & Ops' : 'Operational Telemetry & Grid Status'}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-navy-900">
            {user?.role === 'MUNICIPAL_OFFICER' ? 'Department Operations Overview' : 'Municipal Operations Overview'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {user?.role === 'MUNICIPAL_OFFICER'
              ? 'Monitor department civic grievances, dispatch status, and SLA resolution.'
              : 'Monitor civic grievances, engineering dispatch, and SLA resolution progress across Pune.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <MapIcon className="w-4 h-4 text-teal-accent" />
            <span>Open Live Map</span>
          </button>
          <button
            onClick={() => navigate('/assignments')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <ClipboardList className="w-4 h-4" />
            <span>View Assignments</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Reports */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Reports</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">
            {loadingMetrics ? '...' : metrics?.total_reports ?? 0}
          </div>
          <div className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
            <span>Cumulative database entries</span>
          </div>
        </div>

        {/* Open Issues */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Queue</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-status-medium">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-status-medium">
            {loadingMetrics ? '...' : metrics?.open_issues ?? 0}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            <span>Awaiting field closure</span>
          </div>
        </div>

        {/* High Priority Issues */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Urgent Safety</span>
            <div className="p-1.5 rounded-lg bg-red-50 text-status-critical">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-status-critical">
            {loadingMetrics ? '...' : metrics?.high_priority_issues ?? 0}
          </div>
          <div className="text-[11px] text-status-critical font-medium mt-1">
            <span>Score ≥ 55 or Critical</span>
          </div>
        </div>

        {/* Resolved This Month */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Resolved</span>
            <div className="p-1.5 rounded-lg bg-green-50 text-status-resolved">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-status-resolved">
            {loadingMetrics ? '...' : metrics?.resolved_this_month ?? 0}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            <span>Rate: {metrics?.resolution_rate_percent ?? 0}%</span>
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Resolution</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-accent">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">
            {loadingMetrics ? '...' : `${metrics?.avg_resolution_hours ?? 0}h`}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            <span>Median: {metrics?.median_resolution_hours ?? 0}h</span>
          </div>
        </div>

        {/* Overdue Issues */}
        <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue (&gt;7d)</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-status-high">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-status-high">
            {loadingMetrics ? '...' : metrics?.overdue_issues ?? 0}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            <span>Exceeds standard SLA</span>
          </div>
        </div>
      </div>

      {/* Charts Row: Donut Categories + Status Pipeline + Resolution Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A. Issue Distribution by Category */}
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-navy-900">Issue Categories Breakdown</h2>
              <p className="text-[11px] text-text-muted">Proportion of reported urban problems</p>
            </div>
            <div className="text-xs bg-surface-muted px-2.5 py-1 rounded-lg font-semibold text-text-muted">
              {categoryData.length} Types
            </div>
          </div>

          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={`cell-${entry.category}`}
                      fill={CATEGORY_COLORS[entry.category] || '#64748B'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [
                    `${val} reports`,
                    name.replace('_', ' ')
                  ]}
                  contentStyle={{ backgroundColor: '#171B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category mini legend */}
          <div className="mt-auto pt-3 border-t border-surface-border grid grid-cols-2 gap-2 text-xs">
            {categoryData.slice(0, 4).map((c) => (
              <div key={c.category} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[c.category] || '#94A3B8' }}
                />
                <span className="truncate text-text-muted">{c.category.replace('_', ' ')}:</span>
                <span className="font-bold text-text-main ml-auto">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* B. Issue Status Workflow Pipeline */}
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-navy-900">Resolution Workflow Pipeline</h2>
              <p className="text-[11px] text-text-muted">Current phase distribution across city</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  formatter={(val: number) => [`${val} complaints`, 'Count']}
                  contentStyle={{ backgroundColor: '#171B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={`bar-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#3158D8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto pt-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>Enforced state transitions</span>
            <span className="font-semibold text-primary">8 Lifecycle States</span>
          </div>
        </div>

        {/* C. 14-Day Velocity Trend */}
        <div className="bg-white p-5 rounded-panel border border-surface-border shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-navy-900">14-Day Velocity Trend</h2>
              <p className="text-[11px] text-text-muted">Incoming grievances vs completed fixes</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ left: -15, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#171B35', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="submitted" stroke="#3158D8" strokeWidth={2} name="Submitted" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resolved" stroke="#16A34A" strokeWidth={2} name="Resolved" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto pt-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
            <span>Net throughput ratio</span>
            <span className="font-semibold text-status-resolved">Positive Velocity</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Priority Queue + Ward Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Priority Queue */}
        <div className="lg:col-span-2 bg-white rounded-panel border border-surface-border shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between bg-surface-muted/40">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-status-critical" />
                <h2 className="font-bold text-sm text-navy-900">Urgent Safety Priority Queue</h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Top unresolved complaints ranked by deterministic urgency algorithm
              </p>
            </div>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-surface-border flex-1">
            {topPriorityIssues.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No active critical issues in queue.
              </div>
            ) : (
              topPriorityIssues.map((issue) => {
                const isEmergency = issue.priority_breakdown?.is_emergency;
                return (
                  <div
                    key={issue.id}
                    onClick={() => navigate(`/map?id=${issue.id}`)}
                    className="p-4 hover:bg-surface-muted/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                          {issue.ticket_id}
                        </span>
                        <span className="text-xs font-bold text-text-main truncate max-w-sm">
                          {issue.title}
                        </span>
                        {isEmergency && (
                          <span className="bg-red-100 text-status-critical text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <ShieldAlert className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-accent" />
                          <span>{issue.address_text || issue.ward_name || 'Pune'}</span>
                        </span>
                        <span>•</span>
                        <span>{issue.category.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {/* Priority Score Gauge */}
                      <div className="text-right">
                        <div className="text-xs text-text-muted font-medium">Priority</div>
                        <div className="text-base font-extrabold text-navy-900">
                          {issue.priority_score.toFixed(1)}
                          <span className="text-[10px] text-text-muted font-normal">/100</span>
                        </div>
                      </div>

                      {/* Status pill */}
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase"
                        style={{
                          backgroundColor: `${STATUS_COLORS[issue.status]}20`,
                          color: STATUS_COLORS[issue.status]
                        }}
                      >
                        {issue.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ward Distribution Overview */}
        <div className="bg-white rounded-panel border border-surface-border shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-navy-900">Jurisdiction by Ward</h2>
              <p className="text-[11px] text-text-muted">Zonal workload distribution</p>
            </div>
            <Layers className="w-4 h-4 text-text-muted" />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {wardData.map((w) => {
              const resolutionRate = w.total_count > 0 ? Math.round((w.resolved_count / w.total_count) * 100) : 0;
              return (
                <div key={w.ward_id} className="p-3 bg-surface-muted rounded-xl border border-surface-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-navy-900">{w.ward_name}</span>
                    <span className="text-[11px] font-semibold text-text-muted">
                      {w.resolved_count} / {w.total_count} resolved
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-accent h-full transition-all duration-500"
                      style={{ width: `${resolutionRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted mt-1.5">
                    <span>{w.open_count} open grievances</span>
                    <span className="font-semibold text-status-resolved">{resolutionRate}% done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
