import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Check, RotateCw, Users } from 'lucide-react';
import { api } from '../services/api';

export const OfficerManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const officersQuery = useQuery({
    queryKey: ['officers'],
    queryFn: api.listOfficers,
  });
  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: api.listDepartments,
  });

  const departmentNames = useMemo(
    () => new Map((departmentsQuery.data ?? []).map(department => [department.id, department.name])),
    [departmentsQuery.data],
  );

  const updateMutation = useMutation({
    mutationFn: ({ userId, departmentId }: { userId: number; departmentId: number | null }) =>
      api.updateOfficerDepartment(userId, departmentId),
    onSuccess: (updatedOfficer) => {
      setDrafts(current => {
        const next = { ...current };
        delete next[updatedOfficer.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['officers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments_issues'] });
    },
  });

  const officers = officersQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-start gap-4">
        <div className="rounded-2xl bg-blue-50 p-3 text-primary"><Users className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Officer Department Management</h1>
          <p className="mt-1 text-sm text-text-muted">Assign each municipal officer to the department responsible for their work orders.</p>
        </div>
      </header>

      {updateMutation.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {updateMutation.error instanceof Error ? updateMutation.error.message : 'The department assignment could not be saved.'}
        </div>
      )}

      {officersQuery.isError || departmentsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-semibold">Officer and department data could not be loaded.</p>
          <button
            onClick={() => { void officersQuery.refetch(); void departmentsQuery.refetch(); }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-600"
          ><RotateCw className="h-3.5 w-3.5" /> Try again</button>
        </div>
      ) : officersQuery.isLoading || departmentsQuery.isLoading ? (
        <div className="rounded-2xl border border-surface-border bg-white p-10 text-center text-sm text-text-muted">Loading officers and departments…</div>
      ) : officers.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-white p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-semibold text-navy-900">No municipal officer accounts found.</p>
        </div>
      ) : (
        <section className="space-y-3" aria-label="Municipal officers">
          {officers.map(officer => {
            const currentValue = String(officer.department_id ?? '');
            const selectedValue = drafts[officer.id] ?? currentValue;
            const changed = selectedValue !== currentValue;
            const isSaving = updateMutation.isPending && updateMutation.variables?.userId === officer.id;

            return (
              <article key={officer.id} className="grid gap-4 rounded-2xl border border-surface-border bg-white p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_minmax(220px,300px)_auto] sm:items-center sm:p-5">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-navy-900">{officer.full_name}</h2>
                  <p className="mt-0.5 truncate text-sm text-text-muted">{officer.email}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Current department: <span className="font-semibold text-text-main">{officer.department_id ? departmentNames.get(officer.department_id) ?? 'Unknown department' : 'Not assigned'}</span>
                  </p>
                </div>

                <label className="block text-xs font-semibold text-text-muted">
                  Assign department
                  <select
                    value={selectedValue}
                    onChange={event => setDrafts(current => ({ ...current, [officer.id]: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="">No department</option>
                    {(departmentsQuery.data ?? []).map(department => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={!changed || isSaving}
                  onClick={() => updateMutation.mutate({ userId: officer.id, departmentId: selectedValue ? Number(selectedValue) : null })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isSaving ? <RotateCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isSaving ? 'Saving…' : 'Save assignment'}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
