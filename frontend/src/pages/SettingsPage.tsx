import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Route,
  Trash2,
  Building,
  ShieldCheck,
  Key,
  ExternalLink,
  Layers,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { SavedRoute, Department, Ward } from '../types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery<SavedRoute[]>({ queryKey: ['saved_routes'], queryFn: api.listSavedRoutes });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: api.listDepartments });
  const { data: wards = [] } = useQuery<Ward[]>({ queryKey: ['wards'], queryFn: api.listWards });

  const deleteRouteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSavedRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_routes'] });
    },
  });

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Platform Settings & Registry</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Municipal administrative structure, saved inspection patrol routes, and credentials reference.
        </p>
      </div>

      {/* Saved Inspection Routes Management */}
      <div className="bg-white rounded-panel border border-surface-border shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h2 className="font-bold text-sm text-navy-900 flex items-center gap-2">
              <Route className="w-4 h-4 text-teal-accent" />
              Saved Field Inspection Patrol Routes ({routes.length})
            </h2>
            <p className="text-xs text-text-muted">
              Pre-planned municipal inspection circuits created via the Live Map routing tool.
            </p>
          </div>
          <button
            onClick={() => navigate('/map')}
            className="text-xs text-primary hover:underline font-bold"
          >
            Create New Route on Map
          </button>
        </div>

        <div className="divide-y divide-surface-border">
          {routes.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-muted">
              No saved routes found. Use the "Mark Custom Route" button on the Live Map to plan and save one!
            </div>
          ) : (
            routes.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-navy-900">{r.name}</div>
                  <div className="text-[11px] text-text-muted">
                    Total distance: <span className="font-semibold text-text-main">{r.total_distance_km} km</span> •{' '}
                    Waypoints: {r.waypoints_geojson?.features?.length || 0} • Created by {r.creator_name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteRouteMutation.mutate(r.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-status-critical hover:bg-red-50 transition"
                    title="Delete route"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Municipal Departments & SLA Standards */}
      <div className="bg-white rounded-panel border border-surface-border shadow-xs p-5 space-y-4">
        <div className="border-b border-surface-border pb-3">
          <h2 className="font-bold text-sm text-navy-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            Configured Municipal Departments & Service Level Agreements (SLAs)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {departments.map((d) => (
            <div key={d.id} className="p-3.5 bg-surface-muted rounded-xl border border-surface-border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy-900">{d.name}</span>
                <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold">{d.code}</span>
              </div>
              <p className="text-text-muted text-[11px]">{d.description}</p>
              <div className="text-[10px] text-teal-accent font-semibold pt-1">
                Standard Resolution SLA: 24 - 48 Hours
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Credentials Reference Box */}
      <div className="bg-navy-900 text-white rounded-panel p-6 shadow-md space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Key className="w-4 h-4 text-teal-accent" />
          <span>Demonstration Role Credentials Reference</span>
        </div>
        <p className="text-xs text-slate-300">
          The platform includes 4 pre-configured demo roles seeded in Pune. You can switch between them instantly using the top header role buttons or log in directly:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono pt-1">
          <div className="p-2.5 bg-navy-800 rounded-lg border border-navy-700">
            <span className="text-teal-accent font-bold">Citizen:</span> citizen@civicfix.org / CivicFix2026!
          </div>
          <div className="p-2.5 bg-navy-800 rounded-lg border border-navy-700">
            <span className="text-teal-accent font-bold">Officer:</span> officer@civicfix.org / CivicFix2026!
          </div>
          <div className="p-2.5 bg-navy-800 rounded-lg border border-navy-700">
            <span className="text-teal-accent font-bold">Worker:</span> worker@civicfix.org / CivicFix2026!
          </div>
          <div className="p-2.5 bg-navy-800 rounded-lg border border-navy-700">
            <span className="text-teal-accent font-bold">Admin:</span> admin@civicfix.org / CivicFix2026!
          </div>
        </div>
      </div>
    </div>
  );
};
