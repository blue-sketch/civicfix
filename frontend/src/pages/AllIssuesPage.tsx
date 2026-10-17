import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Eye,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IssueCategory, IssueStatus, IssueSeverity, IssueDetail } from '../types';

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  SUBMITTED: { bg: 'bg-slate-100', text: 'text-slate-700' },
  VERIFIED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ASSIGNED: { bg: 'bg-amber-100', text: 'text-amber-800' },
  IN_PROGRESS: { bg: 'bg-orange-100', text: 'text-orange-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800' },
  CLOSED: { bg: 'bg-slate-200', text: 'text-slate-800' },
  REOPENED: { bg: 'bg-red-100', text: 'text-red-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const AllIssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Query issues
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues_table', page, pageSize, searchTerm, filterCategory, filterStatus, filterSeverity, sortBy, sortOrder],
    queryFn: () =>
      api.listIssues({
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        severity: filterSeverity !== 'ALL' ? filterSeverity : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (issueId: string) => api.verifyIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues_table'] });
    },
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!issuesData || issuesData.items.length === 0) return;
    const headers = ['Ticket ID', 'Title', 'Category', 'Severity', 'Status', 'Ward', 'Priority Score', 'Created At'];
    const rows = issuesData.items.map((i) => [
      i.ticket_id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.status,
      i.ward_name || '',
      i.priority_score,
      new Date(i.created_at).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicFix_Issues_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPrivileged = user?.role && ['MUNICIPAL_OFFICER', 'ADMIN'].includes(user.role);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Issue Management Registry</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Comprehensive audit table of municipal grievances, priority scores, and team statuses.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-white hover:bg-surface-muted text-navy-900 border border-surface-border px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-panel border border-surface-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search ticket ID or description..."
              className="w-full bg-surface-muted border border-surface-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs font-medium text-text-main focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Categories</option>
            <option value="POTHOLE">Pothole</option>
            <option value="ROAD_CRACK">Road Crack</option>
            <option value="GARBAGE">Garbage</option>
            <option value="WATER_LEAK">Water Leak</option>
            <option value="STREETLIGHT">Streetlight</option>
            <option value="WATERLOGGING">Waterlogging</option>
            <option value="FALLEN_TREE">Fallen Tree</option>
            <option value="DAMAGED_INFRASTRUCTURE">Damaged Infra</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs font-medium text-text-main focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VERIFIED">Verified</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              setPage(1);
            }}
            className="bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs font-medium text-text-main focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-panel border border-surface-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted/60 border-b border-surface-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Grievance Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Ward / Area</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Loading records from municipal database...
                  </td>
                </tr>
              ) : issuesData?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    No matching grievances found for selected criteria.
                  </td>
                </tr>
              ) : (
                issuesData?.items.map((issue) => {
                  const badge = STATUS_BADGES[issue.status] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                  const isEmergency = issue.priority_breakdown?.is_emergency;

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-surface-muted/40 transition group cursor-pointer"
                      onClick={() => navigate(`/map?id=${issue.id}`)}
                    >
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        {issue.ticket_id}
                      </td>

                      {/* Title & snippet */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-text-main truncate group-hover:text-primary transition">
                          {issue.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">
                          {issue.description}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-text-main">
                          {issue.category.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Ward */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-text-muted">{issue.ward_name || 'Pune Central'}</span>
                      </td>

                      {/* Priority Score Gauge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isEmergency && <Flame className="w-3.5 h-3.5 text-status-critical" />}
                          <span className="font-extrabold text-navy-900">
                            {issue.priority_score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-text-muted">({issue.severity})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${badge.bg} ${badge.text}`}>
                          {issue.status}
                        </span>
                      </td>

                      {/* Assigned Team */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-text-muted">
                        {issue.assignments.length > 0 ? (
                          <span className="font-medium text-text-main">{issue.assignments[0].team_name}</span>
                        ) : (
                          <span className="italic text-slate-400">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPrivileged && issue.status === 'SUBMITTED' && (
                            <button
                              onClick={() => verifyMutation.mutate(issue.id)}
                              className="px-2.5 py-1 rounded bg-blue-50 text-primary hover:bg-blue-100 font-bold text-[10px] transition"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/map?id=${issue.id}`)}
                            className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface-muted transition"
                            title="Inspect in Live Map workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-surface-border flex items-center justify-between text-xs text-text-muted bg-surface-muted/30">
          <div>
            Showing Page <span className="font-bold text-text-main">{issuesData?.page ?? 1}</span> of{' '}
            <span className="font-bold text-text-main">{issuesData?.total_pages ?? 1}</span> (
            <span className="font-bold text-text-main">{issuesData?.total ?? 0}</span> total complaints)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-40 transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(issuesData?.total_pages || 1, p + 1))}
              disabled={!issuesData || page >= issuesData.total_pages}
              className="p-1.5 rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-40 transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
