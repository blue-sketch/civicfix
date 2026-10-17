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
  X,
  Award,
  ShieldAlert,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IssueDetail } from '../types';

export const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';
  const isOfficer = user?.role === 'MUNICIPAL_OFFICER';

  // Tabs state
  // Admin tabs: 'awaiting_dispatch' | 'completed_certified'
  // Officer tabs: 'assigned' | 'in_progress' | 'resolved' | 'certified'
  const [adminTab, setAdminTab] = useState<'awaiting_dispatch' | 'completed_certified'>('awaiting_dispatch');
  const [officerTab, setOfficerTab] = useState<'assigned' | 'in_progress' | 'resolved' | 'certified'>('assigned');

  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);

  // Admin Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined);
  const [assignmentNote, setAssignmentNote] = useState('');

  // Officer Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

  // Certification Modal State (Officer & Admin)
  const [certifyModalOpen, setCertifyModalOpen] = useState(false);
  const [certificationNotes, setCertificationNotes] = useState('');

  // Queries
  const { data: issuesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['assignments_issues', user?.department_id, user?.role],
    queryFn: () => api.listIssues({ page_size: 100 }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.listDepartments(),
    enabled: isAdmin,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.listTeams(),
    enabled: isAdmin,
  });

  // Admin Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (issueId: string) => api.verifyIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Admin Assign mutation
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

  // Officer Start progress mutation
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

  // Officer Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: () => api.resolveIssue(selectedIssue!.id, resolutionNotes, evidencePhoto || undefined),
    onSuccess: () => {
      setResolveModalOpen(false);
      setResolutionNotes('');
      setEvidencePhoto(null);
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Officer & Admin Certify mutation
  const certifyMutation = useMutation({
    mutationFn: () => api.certifyIssue(selectedIssue!.id, certificationNotes),
    onSuccess: () => {
      setCertifyModalOpen(false);
      setCertificationNotes('');
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  // Citizen protection
  if (user?.role === 'CITIZEN') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-navy-900">Access Restricted</h2>
        <p className="text-sm text-text-muted">
          Operational assignments and dispatch management are reserved for municipal officers and administrators.
        </p>
        <button
          onClick={() => navigate('/overview')}
          className="mt-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-xs font-bold transition"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  // Officer with unassigned department
  if (isOfficer && !user?.department_id) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 my-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-navy-900">No Department Assigned</h2>
        <p className="text-sm text-text-muted">
          Your officer account has no department assigned. Contact an administrator to be assigned to a department to view and manage work orders.
        </p>
      </div>
    );
  }

  const allItems = issuesData?.items || [];

  // Department-scoped issues for Officer
  const departmentIssues = isOfficer
    ? allItems.filter((i) => i.department_id === user?.department_id)
    : allItems;

  // Filter queues
  // Admin queues:
  const adminAwaitingQueue = allItems.filter((i) => ['SUBMITTED', 'VERIFIED'].includes(i.status));
  const adminCompletedQueue = allItems.filter((i) => ['RESOLVED', 'CERTIFIED', 'CLOSED'].includes(i.status));

  // Officer queues:
  const officerAssignedQueue = departmentIssues.filter((i) => i.status === 'ASSIGNED');
  const officerInProgressQueue = departmentIssues.filter((i) => i.status === 'IN_PROGRESS');
  const officerResolvedQueue = departmentIssues.filter((i) => i.status === 'RESOLVED');
  const officerCertifiedQueue = departmentIssues.filter((i) => ['CERTIFIED', 'CLOSED'].includes(i.status));

  const currentList = isAdmin
    ? adminTab === 'awaiting_dispatch'
      ? adminAwaitingQueue
      : adminCompletedQueue
    : officerTab === 'assigned'
    ? officerAssignedQueue
    : officerTab === 'in_progress'
    ? officerInProgressQueue
    : officerTab === 'resolved'
    ? officerResolvedQueue
    : officerCertifiedQueue;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">
          {isAdmin ? 'Municipal Verification & Dispatch Control' : 'Department Operational Work Orders'}
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          {isAdmin
            ? 'Verify incoming public grievances, assign specialized municipal departments, and monitor certified completions.'
            : 'Execute field work orders for your department, advance repair workflows, record technical resolution, and certify completion.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border text-xs font-bold gap-6 overflow-x-auto">
        {isAdmin ? (
          <>
            <button
              onClick={() => setAdminTab('awaiting_dispatch')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                adminTab === 'awaiting_dispatch'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Awaiting Verification & Dispatch</span>
              <span className="bg-amber-100 text-status-medium text-[10px] px-2 py-0.5 rounded-full">
                {adminAwaitingQueue.length}
              </span>
            </button>

            <button
              onClick={() => setAdminTab('completed_certified')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                adminTab === 'completed_certified'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed & Certified</span>
              <span className="bg-green-100 text-status-resolved text-[10px] px-2 py-0.5 rounded-full">
                {adminCompletedQueue.length}
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setOfficerTab('assigned')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                officerTab === 'assigned'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Assigned</span>
              <span className="bg-blue-100 text-primary text-[10px] px-2 py-0.5 rounded-full">
                {officerAssignedQueue.length}
              </span>
            </button>

            <button
              onClick={() => setOfficerTab('in_progress')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                officerTab === 'in_progress'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>In Progress</span>
              <span className="bg-orange-100 text-status-high text-[10px] px-2 py-0.5 rounded-full">
                {officerInProgressQueue.length}
              </span>
            </button>

            <button
              onClick={() => setOfficerTab('resolved')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                officerTab === 'resolved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready for Certification</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full">
                {officerResolvedQueue.length}
              </span>
            </button>

            <button
              onClick={() => setOfficerTab('certified')}
              className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                officerTab === 'certified'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Certified</span>
              <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full">
                {officerCertifiedQueue.length}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Task Queue List */}
      <div className="space-y-3">
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <h2 className="font-bold">Work orders couldn’t be loaded</h2>
          <p className="mt-1">{error instanceof Error ? error.message : 'The server could not load the work queue.'}</p>
          <button onClick={() => refetch()} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Retry</button>
        </div>
      ) : isLoading ? (
          <div className="bg-white p-12 text-center text-text-muted rounded-panel border border-surface-border animate-pulse">
            Loading operational registry...
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
                  <span className="font-semibold text-navy-900">
                    Priority: {issue.priority_score.toFixed(1)}/100
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {/* ADMIN ACTIONS ONLY */}
                {isAdmin && (
                  <>
                    {issue.status === 'SUBMITTED' && (
                      <button
                        onClick={() => verifyMutation.mutate(issue.id)}
                        disabled={verifyMutation.isPending}
                        className="bg-blue-50 text-primary hover:bg-blue-100 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
                      >
                        Verify
                      </button>
                    )}

                    {['SUBMITTED', 'VERIFIED'].includes(issue.status) && (
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setSelectedDeptId(issue.department_id || undefined);
                          setAssignModalOpen(true);
                        }}
                        className="bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        Assign Team
                      </button>
                    )}

                    {issue.status === 'RESOLVED' && (
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setCertifyModalOpen(true);
                        }}
                        className="bg-teal-accent hover:bg-teal-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Certify Issue</span>
                      </button>
                    )}
                  </>
                )}

                {/* OFFICER ACTIONS ONLY */}
                {isOfficer && (
                  <>
                    {/* Action 1: Start Work */}
                    {issue.status === 'ASSIGNED' && (
                      <button
                        onClick={() => startProgressMutation.mutate(issue.id)}
                        disabled={startProgressMutation.isPending}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Start Work</span>
                      </button>
                    )}

                    {/* Action 2: Resolve Issue */}
                    {issue.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setResolveModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve Issue</span>
                      </button>
                    )}

                    {/* Action 3: Certify Issue */}
                    {issue.status === 'RESOLVED' && (
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setCertifyModalOpen(true);
                        }}
                        className="bg-teal-accent hover:bg-teal-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Certify Issue</span>
                      </button>
                    )}
                  </>
                )}

                {/* Common Inspect on Map action */}
                <button
                  onClick={() => navigate(`/map?id=${issue.id}`)}
                  className="bg-surface-muted hover:bg-slate-200 text-text-main px-3 py-1.5 rounded-xl font-bold text-xs transition border border-surface-border cursor-pointer"
                >
                  Inspect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Assignment Modal */}
      {assignModalOpen && selectedIssue && isAdmin && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedIssue.ticket_id}</span>
                <h3 className="font-bold text-sm text-navy-900 mt-0.5">Assign Municipal Resolution Team</h3>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-text-muted hover:bg-surface-muted p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-navy-900 mb-1">Target Department *</label>
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
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending}
                className="bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Officer Resolution Modal */}
      {resolveModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedIssue.ticket_id}</span>
                <h3 className="font-bold text-sm text-navy-900 mt-0.5">Resolve Civic Issue</h3>
              </div>
              <button
                onClick={() => setResolveModalOpen(false)}
                className="text-text-muted hover:bg-surface-muted p-1 rounded cursor-pointer"
              >
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
                <label className="block font-bold text-navy-900 mb-1">Attach Completion Evidence Photo (Optional)</label>
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
              <button
                onClick={() => setResolveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate()}
                disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certification Modal (Officer & Admin) */}
      {certifyModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-surface-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700">{selectedIssue.ticket_id}</span>
                <h3 className="font-bold text-sm text-navy-900 mt-0.5">Certify Issue Completion</h3>
              </div>
              <button
                onClick={() => setCertifyModalOpen(false)}
                className="text-text-muted hover:bg-surface-muted p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs leading-relaxed">
                By certifying this issue, you confirm that field work meets municipal engineering and safety standards. The certification will be permanently timestamped with your credentials.
              </div>

              <div>
                <label className="block font-bold text-navy-900 mb-1">Certification Notes / Quality Stamp</label>
                <textarea
                  value={certificationNotes}
                  onChange={(e) => setCertificationNotes(e.target.value)}
                  placeholder="e.g. Inspected site. Asphalt compaction meets Grade-2 municipal road standards. Safe for traffic."
                  rows={3}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                onClick={() => setCertifyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => certifyMutation.mutate()}
                disabled={certifyMutation.isPending}
                className="bg-teal-accent hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Certify Completion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
