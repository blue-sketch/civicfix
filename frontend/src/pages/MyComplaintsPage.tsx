import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  MapPin,
  Calendar,
  Send,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IssueDetail, IssueStatus } from '../types';

export const MyComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [reopenNote, setReopenNote] = useState('');
  const [isReopening, setIsReopening] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Check URL query param ?id=
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedIssueId(id);
    }
  }, [searchParams]);

  // Fetch only this citizen's grievances
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['my_issues', user?.id],
    queryFn: () => (user?.id ? api.listIssues({ reporter_id: user.id, page_size: 50 }) : null),
    enabled: !!user?.id,
  });

  // Fetch full details of selected issue
  const { data: selectedIssue } = useQuery({
    queryKey: ['my_issue_detail', selectedIssueId],
    queryFn: () => (selectedIssueId ? api.getIssue(selectedIssueId) : null),
    enabled: !!selectedIssueId,
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: (issueId: string) => api.reopenIssue(issueId, reopenNote),
    onSuccess: () => {
      setIsReopening(false);
      setReopenNote('');
      queryClient.invalidateQueries({ queryKey: ['my_issues'] });
      queryClient.invalidateQueries({ queryKey: ['my_issue_detail', selectedIssueId] });
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: (issueId: string) => api.addComment(issueId, commentText, false),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['my_issues'] });
      queryClient.invalidateQueries({ queryKey: ['my_issue_detail', selectedIssueId] });
    },
  });

  const items = issuesData?.items || [];

  // Summary counts
  const total = items.length;
  const awaitingVerification = items.filter((i) => i.status === 'SUBMITTED').length;
  const inProgress = items.filter((i) => ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length;
  const resolved = items.filter((i) => ['RESOLVED', 'CERTIFIED', 'CLOSED'].includes(i.status)).length;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">My Registered Complaints</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Track real-time progress, municipal team updates, and request reopening if needed.
          </p>
        </div>

        <button
          onClick={() => navigate('/report')}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          File New Report
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-panel border border-surface-border">
          <div className="text-[11px] font-semibold text-text-muted uppercase">Total Submitted</div>
          <div className="text-2xl font-bold text-navy-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-panel border border-surface-border">
          <div className="text-[11px] font-semibold text-text-muted uppercase">Awaiting Verification</div>
          <div className="text-2xl font-bold text-status-medium mt-1">{awaitingVerification}</div>
        </div>
        <div className="bg-white p-4 rounded-panel border border-surface-border">
          <div className="text-[11px] font-semibold text-text-muted uppercase">In Active Progress</div>
          <div className="text-2xl font-bold text-primary mt-1">{inProgress}</div>
        </div>
        <div className="bg-white p-4 rounded-panel border border-surface-border">
          <div className="text-[11px] font-semibold text-text-muted uppercase">Resolved & Tested</div>
          <div className="text-2xl font-bold text-status-resolved mt-1">{resolved}</div>
        </div>
      </div>

      {/* Complaints List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-text-muted rounded-panel border border-surface-border">
            Loading your grievances...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-12 text-center text-text-muted rounded-panel border border-surface-border space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-sm text-navy-900">No Complaints Logged Yet</div>
            <p className="text-xs max-w-sm mx-auto">
              You haven't reported any civic problems yet. Spot a pothole, leak or dark streetlight?
            </p>
            <button
              onClick={() => navigate('/report')}
              className="mt-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Report an Issue
            </button>
          </div>
        ) : (
          items.map((issue) => (
            <div
              key={issue.id}
              onClick={() => setSelectedIssueId(issue.id)}
              className="bg-white p-4 sm:p-5 rounded-panel border border-surface-border shadow-xs hover:border-primary transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                    {issue.ticket_id}
                  </span>
                  <span className="font-bold text-sm text-navy-900 truncate">{issue.title}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {issue.status}
                  </span>
                </div>

                <p className="text-xs text-text-muted line-clamp-1">{issue.description}</p>

                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-accent" />
                    <span>{issue.address_text || issue.ward_name || 'Pune Area'}</span>
                  </span>
                  <span>•</span>
                  <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{issue.category.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/map?id=${issue.id}`);
                  }}
                  className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface-muted transition"
                  title="View on Map"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail & Reopen Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold bg-primary-light text-primary px-2 py-0.5 rounded">
                    {selectedIssue.ticket_id}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100">
                    {selectedIssue.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-navy-900">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssueId(null)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description & Address */}
            <div className="text-xs space-y-2">
              <div className="font-semibold text-text-muted uppercase text-[10px]">Description</div>
              <p className="bg-surface-muted p-3 rounded-xl border border-surface-border leading-relaxed text-text-main">
                {selectedIssue.description}
              </p>
              <div className="text-text-muted">
                Reported at: <span className="font-medium text-text-main">{selectedIssue.address_text}</span>
              </div>
            </div>

            {/* Timeline History */}
            <div className="text-xs space-y-2">
              <div className="font-semibold text-text-muted uppercase text-[10px]">Municipal Progress Timeline</div>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-surface-border rounded-xl p-3 bg-surface-muted/30">
                {selectedIssue.updates.map((u) => (
                  <div key={u.id} className="flex items-start gap-2 border-b border-surface-border pb-2 last:border-none">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-900 uppercase text-[10px]">{u.to_status}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">{u.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Note If Present */}
            {selectedIssue.resolution_notes && (
              <div className="p-3.5 bg-green-50 rounded-xl border border-green-200 text-xs space-y-1">
                <div className="font-bold text-status-resolved flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolution Certified by Field Team
                </div>
                <p className="text-text-main leading-relaxed">{selectedIssue.resolution_notes}</p>
              </div>
            )}

            {/* Reopening Section (Citizen right to challenge unresolved work) */}
            {['RESOLVED', 'CERTIFIED', 'CLOSED'].includes(selectedIssue.status) && (
              <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl text-xs space-y-2">
                <div className="font-bold text-status-critical flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  Not Satisfied? Request Reopening
                </div>
                <p className="text-[11px] text-text-muted">
                  If the problem is still physically present or was improperly fixed, request an immediate re-inspection.
                </p>

                {isReopening ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={reopenNote}
                      onChange={(e) => setReopenNote(e.target.value)}
                      placeholder="Explain why this problem remains unresolved on site..."
                      rows={2}
                      className="w-full bg-white border border-red-300 rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-status-critical"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsReopening(false)}
                        className="px-3 py-1.5 rounded-lg text-text-muted font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => reopenMutation.mutate(selectedIssue.id)}
                        disabled={!reopenNote.trim() || reopenMutation.isPending}
                        className="bg-status-critical hover:bg-red-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-bold"
                      >
                        Confirm Reopen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsReopening(true)}
                    className="bg-status-critical hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg font-bold transition text-xs"
                  >
                    Request Reopen
                  </button>
                )}
              </div>
            )}

            {/* Citizen Comments & Inquiries */}
            <div className="text-xs space-y-2 pt-2 border-t border-surface-border">
              <div className="font-semibold text-text-muted uppercase text-[10px]">Add Inquiry or Comment</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a message to municipal officers..."
                  className="flex-1 bg-surface-muted border border-surface-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    if (commentText.trim()) commentMutation.mutate(selectedIssue.id);
                  }}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
