import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Inbox
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IssueStatus } from '../types';

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  SUBMITTED: { label: 'Submitted', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  VERIFIED: { label: 'Verified', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CERTIFIED: { label: 'Certified Complete', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  REOPENED: { label: 'Reopened', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const CitizenOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch the citizen's own complaints (server automatically isolates to reporter_id == current_user.id)
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['citizen_my_complaints'],
    queryFn: () => api.listIssues({ page: 1, page_size: 50, sort_by: 'created_at', sort_order: 'desc' }),
  });

  const issues = issuesData?.items || [];

  // Exactly three personal metrics
  const totalSubmitted = issues.length;
  const totalInProgress = issues.filter((i) =>
    ['SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(i.status)
  ).length;
  const totalResolved = issues.filter((i) =>
    ['RESOLVED', 'CERTIFIED', 'CLOSED'].includes(i.status)
  ).length;

  const recentComplaints = issues.slice(0, 5);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* 1. Warm Personal Greeting Header */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-primary/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-teal-accent text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Citizen Service Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Citizen'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Here's an update on the civic issues you've reported in your neighborhood. Track progress, communicate with municipal officers, and keep Pune clean and safe.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => navigate('/report')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-teal-accent hover:bg-teal-accent/90 text-navy-950 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg hover:shadow-teal-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Report an Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Exactly Three Personal Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Submitted */}
        <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Total Submitted
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-primary">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900">
            {isLoading ? '...' : totalSubmitted}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Total complaints logged by your account
          </p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900">
            {isLoading ? '...' : totalInProgress}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Currently active & being handled by municipal teams
          </p>
        </div>

        {/* Resolved */}
        <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Resolved
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900">
            {isLoading ? '...' : totalResolved}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Work completed and verified by civic officers
          </p>
        </div>
      </div>

      {/* 3. My Recent Complaints Section */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900">My Recent Complaints</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Review recent updates and status on your reported issues
            </p>
          </div>
          {issues.length > 0 && (
            <Link
              to="/my-complaints"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition"
            >
              <span>View All My Complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-text-muted text-sm animate-pulse">
            Loading your reports...
          </div>
        ) : issues.length === 0 ? (
          /* 4. Helpful Empty State */
          <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-surface-border flex items-center justify-center mx-auto text-text-muted shadow-xs">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-900">No issues reported yet</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Spot a pothole, broken streetlight, or garbage pile in your neighborhood? Submit your first report and help us keep Pune civic infrastructure in prime condition!
              </p>
            </div>
            <button
              onClick={() => navigate('/report')}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Your First Issue</span>
            </button>
          </div>
        ) : (
          /* Compact list of 3-5 complaints */
          <div className="divide-y divide-surface-border">
            {recentComplaints.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status] || {
                label: item.status,
                bg: 'bg-gray-100',
                text: 'text-gray-700',
                border: 'border-gray-200',
              };

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.ticket_id}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                        {item.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-navy-900 truncate">
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Reported {formatDate(item.created_at)}</span>
                      </span>
                      {item.ward_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{item.ward_name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    <button
                      onClick={() => navigate(`/my-complaints?id=${item.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 bg-slate-100 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
