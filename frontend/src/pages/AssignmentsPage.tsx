import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Send,
  Camera,
  MapPin,
  Flame,
  ArrowRight,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IssueDetail, Team, Department } from '../types';

export const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'resolved'>('pending');
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined);
  const [assignmentNote, setAssignmentNote] = useState('');

  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

  // Queries
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['assignments_issues'],
    queryFn: () => api.listIssues({ page_size: 100 }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.listDepartments(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.listTeams(),
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (issueId: string) => api.verifyIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: () =>
      api.assignIssue(selectedIssue!.id, {
        department_id: selectedDeptId,
        team_id: selectedTeamId,
        notes: assignmentNote,
      }),
    onSuccess: () => {
      setAssignModalOpen(false);
      setAssignmentNote('');
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Start progress mutation
  const startProgressMutation = useMutation({
    mutationFn: (issueId: string) =>
      api.updateIssueStatus(issueId, {
        status: 'IN_PROGRESS',
        note: 'Field crew arrived on site with materials and commenced repairs',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: () => api.resolveIssue(selectedIssue!.id, resolutionNotes, evidencePhoto || undefined),
    onSuccess: () => {
      setResolveModalOpen(false);
      setResolutionNotes('');
      setEvidencePhoto(null);
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  const allItems = issuesData?.items || [];

  // Filter queues
  const pendingQueue = allItems.filter((i) => ['SUBMITTED', 'VERIFIED'].includes(i.status));
  const inProgressQueue = allItems.filter((i) => ['ASSIGNED', 'IN_PROGRESS'].includes(i.status));
  const resolvedQueue = allItems.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status));

  const currentList =
    activeTab === 'pending'
      ? pendingQueue
      : activeTab === 'in_progress'
      ? inProgressQueue
      : resolvedQueue;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">
          Municipal Dispatch & Field Operations
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Verify grievances, dispatch specialized municipal teams, update work progress, and certify field resolutions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Awaiting Verification & Dispatch</span>
          <span className="bg-amber-100 text-status-medium text-[10px] px-2 py-0.5 rounded-full">
            {pendingQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'in_progress'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Field Work In Progress</span>
          <span className="bg-blue-100 text-primary text-[10px] px-2 py-0.5 rounded-full">
            {inProgressQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'resolved'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed & Certified</span>
          <span className="bg-green-100 text-status-resolved text-[10px] px-2 py-0.5 rounded-full">
            {resolvedQueue.length}
          </span>
        </button>
      </div>

      {/* Task Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-text-muted rounded-panel border border-surface-border">
            Loading field operations registry...
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white p-12 text-center text-text-muted rounded-panel border border-surface-border">
            No grievances in this operational queue.
          </div>
        ) : (
          currentList.map((issue) => (
            <div
              key={issue.id}
              className="bg-white p-4 sm:p-5 rounded-panel border border-surface-border shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                    {issue.ticket_id}
                  </span>
                  <span className="font-bold text-sm text-navy-900 truncate max-w-md">
                    {issue.title}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {issue.status}
                  </span>
                  {issue.priority_breakdown?.is_emergency && (
                    <span className="bg-red-100 text-status-critical text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      URGENT SAFETY
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted line-clamp-1">{issue.description}</p>

                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-accent" />
                    <span>{issue.address_text || issue.ward_name || 'Pune Area'}</span>
                  </span>
                  <span>•</span>
                  <span>{issue.category.replace('_', ' ')}</span>
                  <span>•</span>
                  <span className="font-semibold text-navy-900">Priority: {issue.priority_score.toFixed(1)}/100</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {issue.status === 'SUBMITTED' && (
                  <button
                    onClick={() => verifyMutation.mutate(issue.id)}
                    className="bg-blue-50 text-primary hover:bg-blue-100 px-3.5 py-1.5 rounded-xl font-bold text-xs transition"
                  >
                    Verify
                  </button>
                )}

                {['SUBMITTED', 'VERIFIED'].includes(issue.status) && (
                  <button
                    onClick={() => {
                      setSelectedIssue(issue);
                      setAssignModalOpen(true);
                    }}
                    className="bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs"
                  >
                    Assign Team
                  </button>
                )}

                {issue.status === 'ASSIGNED' && (
                  <button
                    onClick={() => startProgressMutation.mutate(issue.id)}
                    className="bg-status-medium hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs"
                  >
                    Start Work
                  </button>
                )}

                {issue.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      setSelectedIssue(issue);
                      setResolveModalOpen(true);
                    }}
                    className="bg-teal-accent hover:bg-teal-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs"
                  >
                    Resolve & Certify
                  </button>
                )}

                <button
                  onClick={() => navigate(`/map?id=${issue.id}`)}
                  className="bg-surface-muted hover:bg-slate-200 text-text-main px-3 py-1.5 rounded-xl font-bold text-xs transition border border-surface-border"
                >
                  Inspect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedIssue.ticket_id}</span>
                <h3 className="font-bold text-sm text-navy-900 mt-0.5">Assign Municipal Resolution Team</h3>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-text-muted hover:bg-surface-muted p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy-900 mb-1">Target Department</label>
                <select
                  value={selectedDeptId || ''}
                  onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 font-medium text-text-main"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy-900 mb-1">Specialized Field Team</label>
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 font-medium text-text-main"
                >
                  <option value="">Select Team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Lead: {t.leader_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-navy-900 mb-1">Dispatch Notes / Priority Directives</label>
                <textarea
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Bring bitumen cold patch compound and road warning cones..."
                  rows={2}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-text-muted">
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending}
                className="bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolveModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedIssue.ticket_id}</span>
                <h3 className="font-bold text-sm text-navy-900 mt-0.5">Certify Work Resolution</h3>
              </div>
              <button onClick={() => setResolveModalOpen(false)} className="text-text-muted hover:bg-surface-muted p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy-900 mb-1">Resolution Technical Notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe repair method, materials used, inspection verification..."
                  rows={3}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-navy-900 mb-1">Attach Completion Evidence Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvidencePhoto(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <button onClick={() => setResolveModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-text-muted">
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate()}
                disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                className="bg-teal-accent hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
