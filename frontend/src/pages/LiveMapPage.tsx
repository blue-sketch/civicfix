import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Filter,
  X,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Share2,
  Calendar,
  Send,
  Image as ImageIcon,
  Copy,
  Check,
  Navigation,
  Layers,
  ChevronLeft,
  ChevronRight,
  Route,
  Trash2,
  Save,
  MessageSquare,
  Sparkles,
  Link2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MapIssue,
  IssueDetail,
  IssueCategory,
  IssueStatus,
  IssueSeverity,
  SavedRoute
} from '../types';

// Category color mappings
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

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All Issues' },
  { key: 'POTHOLE', label: 'Potholes' },
  { key: 'ROAD_CRACK', label: 'Cracking' },
  { key: 'WATERLOGGING', label: 'Waterlogging' },
  { key: 'GARBAGE', label: 'Garbage' },
  { key: 'WATER_LEAK', label: 'Water Leaks' },
  { key: 'STREETLIGHT', label: 'Streetlights' },
  { key: 'DAMAGED_INFRASTRUCTURE', label: 'Damaged Infra' },
  { key: 'OTHER', label: 'Other' },
];

// Helper to create custom SVG map pins
function createMarkerIcon(category: string, priorityScore: number, isSelected: boolean) {
  const color = CATEGORY_COLORS[category] || '#3158D8';
  const isCritical = priorityScore >= 75;
  const size = isSelected ? 38 : isCritical ? 34 : 28;

  const html = `
    <div class="custom-marker-pin ${isSelected ? 'selected' : ''}" style="width: ${size}px; height: ${size}px; background-color: ${color}; border: 2.5px solid white;">
      <svg style="width: 14px; height: 14px; fill: white;" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Controller component to smoothly pan/zoom map to coordinates
function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Route creation click listener
function MapClickHandler({
  routeMode,
  onAddPoint
}: {
  routeMode: boolean;
  onAddPoint: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (routeMode) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export const LiveMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Selected issue detail
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(searchParams.get('id'));
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'comments' | 'photos' | 'duplicates'>('info');

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]);
  const [copied, setCopied] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Custom Route Planning Tool State
  const [routeMode, setRouteMode] = useState<boolean>(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeName, setRouteName] = useState<string>('');
  const [savingRoute, setSavingRoute] = useState<boolean>(false);

  // Sync selected issue from URL param if available
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedIssueId(id);
      setPanelOpen(true);
    }
  }, [searchParams]);

  // Fetch map issues
  const { data: mapIssues = [], isLoading: loadingMap } = useQuery({
    queryKey: ['map_issues', selectedCategory, selectedStatus, selectedWard, selectedPriority],
    queryFn: () =>
      api.getMapIssues({
        category: selectedCategory,
        status: selectedStatus,
        ward_id: selectedWard !== 'ALL' ? Number(selectedWard) : undefined,
      }),
  });

  // Fetch full details of selected issue
  const { data: selectedIssue, isLoading: loadingDetail } = useQuery({
    queryKey: ['issue_detail', selectedIssueId],
    queryFn: () => (selectedIssueId ? api.getIssue(selectedIssueId) : null),
    enabled: !!selectedIssueId,
  });

  // Fetch wards for filter
  const { data: wards = [] } = useQuery({
    queryKey: ['wards'],
    queryFn: () => api.listWards(),
  });

  // Comment submission
  const commentMutation = useMutation({
    mutationFn: () => api.addComment(selectedIssueId!, newComment, isInternalComment),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['issue_detail', selectedIssueId] });
    },
  });

  // Duplicate confirm/reject mutations
  const confirmDupMutation = useMutation({
    mutationFn: (candidateId: number) => api.confirmDuplicate(selectedIssueId!, candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue_detail', selectedIssueId] });
      queryClient.invalidateQueries({ queryKey: ['map_issues'] });
    },
  });

  const rejectDupMutation = useMutation({
    mutationFn: (candidateId: number) => api.rejectDuplicate(selectedIssueId!, candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue_detail', selectedIssueId] });
    },
  });

  // Center on selected issue
  const handleSelectIssue = (issue: MapIssue) => {
    setSelectedIssueId(issue.id);
    setPanelOpen(true);
    setMapCenter([issue.latitude, issue.longitude]);
    setSearchParams({ id: issue.id });
  };

  // Calculate distance between points in KM
  const calculateDistance = (points: [number, number][]): number => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const lat1 = points[i][0] * (Math.PI / 180);
      const lon1 = points[i][1] * (Math.PI / 180);
      const lat2 = points[i + 1][0] * (Math.PI / 180);
      const lon2 = points[i + 1][1] * (Math.PI / 180);
      const dlat = lat2 - lat1;
      const dlon = lon2 - lon1;
      const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += 6371 * c; // Earth radius ~6371 km
    }
    return Math.round(total * 10) / 10;
  };

  // Save Custom Route
  const handleSaveRoute = async () => {
    if (!routeName.trim() || routePoints.length < 2) return;
    setSavingRoute(true);
    try {
      const dist = calculateDistance(routePoints);
      await api.createSavedRoute(routeName, routePoints, dist);
      setRoutePoints([]);
      setRouteName('');
      setRouteMode(false);
      alert('Custom route saved to municipal inspection registry!');
    } catch (e: any) {
      alert(`Failed to save route: ${e.message}`);
    } finally {
      setSavingRoute(false);
    }
  };

  const copyCoordinates = (lat: number, lon: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPrivileged = user?.role && ['MUNICIPAL_OFFICER', 'ADMIN', 'FIELD_WORKER'].includes(user.role);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden bg-surface-bg">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-surface-border px-4 py-2.5 z-20 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-3xl no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'bg-surface-muted text-text-muted hover:text-text-main hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Controls: Ward filter, Status, Route tool */}
        <div className="flex items-center gap-2 text-xs">
          {/* Ward Selector */}
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-lg px-2.5 py-1.5 font-medium text-text-main focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id.toString()}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-lg px-2.5 py-1.5 font-medium text-text-main focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="VERIFIED">Verified</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Mark Custom Route Mode Button */}
          <button
            onClick={() => {
              setRouteMode(!routeMode);
              if (!routeMode) {
                setRoutePoints([]);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow-xs ${
              routeMode
                ? 'bg-status-critical text-white'
                : 'bg-teal-accent text-white hover:bg-teal-600'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>{routeMode ? 'Exit Route Tool' : 'Mark Custom Route'}</span>
          </button>
        </div>
      </div>

      {/* Route Tool Floating Banner (When Active) */}
      {routeMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-navy-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-navy-700 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-accent animate-ping" />
            <span className="font-semibold">Route Planner Active:</span>
            <span className="text-slate-300">
              Click consecutive points on the map. Selected: {routePoints.length} points (
              {calculateDistance(routePoints)} km straight-line preview)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Route name (e.g. Ward 4 Mon Patrol)"
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-1 text-white text-xs placeholder-slate-400 focus:outline-none focus:border-teal-accent"
            />
            <button
              onClick={handleSaveRoute}
              disabled={routePoints.length < 2 || !routeName.trim() || savingRoute}
              className="bg-teal-accent hover:bg-teal-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={() => setRoutePoints([])}
              className="text-slate-400 hover:text-white p-1"
              title="Clear points"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Detail Panel + Right Map */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Collapsible Left Side Detail Panel (approx 380px) */}
        {selectedIssueId && panelOpen && (
          <aside className="w-full sm:w-[420px] bg-white border-r border-surface-border shadow-xl z-30 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {/* Panel Header */}
            <div className="p-4 border-b border-surface-border bg-surface-muted/50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold bg-primary-light text-primary px-2 py-0.5 rounded">
                    {selectedIssue?.ticket_id || 'TKT-...'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-text-main">
                    {selectedIssue?.category.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-navy-900 leading-snug line-clamp-2">
                  {selectedIssue?.title}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-slate-200 transition"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-surface-border text-xs font-semibold bg-white px-2">
              {[
                { id: 'info', label: 'Info' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'comments', label: 'Comments' },
                { id: 'photos', label: 'Photos' },
                { id: 'duplicates', label: 'Duplicates' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2.5 border-b-2 transition capitalize ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-text-muted hover:text-text-main'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-text-muted">Loading grievance dossier...</div>
              ) : selectedIssue ? (
                <>
                  {/* TAB 1: INFO */}
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      {/* Priority Banner with Breakdown */}
                      <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-teal-accent" />
                            Priority Score
                          </span>
                          <span className="font-extrabold text-base text-primary">
                            {selectedIssue.priority_score.toFixed(1)}
                            <span className="text-[10px] text-text-muted font-normal"> / 100</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                          {selectedIssue.priority_breakdown?.explanation ||
                            'Calculated based on severity, public impact, open age, and corroborations.'}
                        </p>
                      </div>

                      {/* Status & Severity Badges */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-surface-muted rounded-xl border border-surface-border">
                          <div className="text-[10px] uppercase font-bold text-text-muted">Status</div>
                          <div className="font-extrabold text-sm text-navy-900 mt-0.5">
                            {selectedIssue.status}
                          </div>
                        </div>
                        <div className="p-2.5 bg-surface-muted rounded-xl border border-surface-border">
                          <div className="text-[10px] uppercase font-bold text-text-muted">Severity</div>
                          <div className="font-extrabold text-sm text-status-critical mt-0.5">
                            {selectedIssue.severity}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <div className="text-[11px] font-bold text-navy-900 uppercase tracking-wider mb-1">
                          Citizen Grievance Description
                        </div>
                        <p className="text-text-main leading-relaxed bg-surface-muted p-3 rounded-xl border border-surface-border">
                          {selectedIssue.description}
                        </p>
                      </div>

                      {/* Location Coordinates & Address */}
                      <div className="p-3 bg-surface-muted rounded-xl border border-surface-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy-900 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-accent" />
                            Location Details
                          </span>
                          <button
                            onClick={() => copyCoordinates(selectedIssue.latitude, selectedIssue.longitude)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copied ? <Check className="w-3 h-3 text-status-resolved" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy Coords'}</span>
                          </button>
                        </div>
                        <div className="text-text-main font-medium">{selectedIssue.address_text || 'Pune Area'}</div>
                        <div className="text-[11px] text-text-muted">
                          Ward: <span className="font-semibold text-text-main">{selectedIssue.ward_name || 'Central'}</span> •{' '}
                          {selectedIssue.latitude.toFixed(5)}, {selectedIssue.longitude.toFixed(5)}
                        </div>
                      </div>

                      {/* Assigned Team */}
                      <div className="p-3 bg-surface-muted rounded-xl border border-surface-border space-y-1">
                        <div className="text-[11px] font-bold text-navy-900 uppercase tracking-wider">
                          Assigned Operations Team
                        </div>
                        {selectedIssue.assignments.length > 0 ? (
                          <div>
                            <div className="font-semibold text-text-main">
                              {selectedIssue.assignments[0].team_name || 'Rapid Response Unit'}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              Assigned by {selectedIssue.assignments[0].assigned_by_name} on{' '}
                              {new Date(selectedIssue.assignments[0].assigned_at).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-text-muted italic">No team assigned yet</div>
                        )}
                      </div>

                      {/* Resolution Notes (if resolved) */}
                      {selectedIssue.resolution_notes && (
                        <div className="p-3.5 bg-green-50 rounded-xl border border-green-200 space-y-1">
                          <div className="font-bold text-status-resolved flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Field Resolution Certified
                          </div>
                          <p className="text-text-main leading-relaxed">
                            {selectedIssue.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TIMELINE */}
                  {activeTab === 'timeline' && (
                    <div className="space-y-4">
                      <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                        Audit Trail of Transitions
                      </div>
                      <div className="relative border-l-2 border-slate-200 ml-3 space-y-5 py-2">
                        {selectedIssue.updates.map((upd) => (
                          <div key={upd.id} className="relative pl-6">
                            <span className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-navy-900 uppercase text-[11px]">
                                {upd.to_status}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                {new Date(upd.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-text-muted text-[11px] mt-0.5">{upd.note}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Actor: {upd.actor_name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: COMMENTS */}
                  {activeTab === 'comments' && (
                    <div className="flex flex-col h-full space-y-3">
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {selectedIssue.comments.length === 0 ? (
                          <div className="text-center text-text-muted py-6">No comments recorded yet.</div>
                        ) : (
                          selectedIssue.comments.map((c) => (
                            <div
                              key={c.id}
                              className={`p-3 rounded-xl border text-xs ${
                                c.is_internal
                                  ? 'bg-amber-50/70 border-amber-200'
                                  : 'bg-surface-muted border-surface-border'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                                <span className="font-bold text-text-main">
                                  {c.author_name} ({c.author_role})
                                </span>
                                <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-text-main leading-relaxed">{c.comment_text}</p>
                              {c.is_internal && (
                                <span className="inline-block mt-1 text-[9px] font-bold text-amber-800 uppercase">
                                  Internal Official Note
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newComment.trim()) commentMutation.mutate();
                        }}
                        className="pt-2 border-t border-surface-border space-y-2"
                      >
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Type an update or reply..."
                          rows={2}
                          className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                        />
                        <div className="flex items-center justify-between">
                          {isPrivileged && (
                            <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isInternalComment}
                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                className="rounded text-primary"
                              />
                              <span>Internal staff note</span>
                            </label>
                          )}
                          <button
                            type="submit"
                            disabled={!newComment.trim() || commentMutation.isPending}
                            className="ml-auto bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* TAB 4: PHOTOS */}
                  {activeTab === 'photos' && (
                    <div className="space-y-4">
                      <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Photographic Evidence ({selectedIssue.photos.length})
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedIssue.photos.map((p) => (
                          <div key={p.id} className="relative group rounded-xl overflow-hidden border border-surface-border">
                            <img
                              src={p.photo_url}
                              alt={p.caption || 'Evidence'}
                              className="w-full h-28 object-cover group-hover:scale-105 transition"
                            />
                            <div className="p-1.5 bg-white text-[10px] text-text-muted truncate">
                              <span className="font-bold text-text-main">{p.photo_type}:</span> {p.caption || 'Photo'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: DUPLICATES */}
                  {activeTab === 'duplicates' && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Nearby Duplicate Candidates
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Geospatial algorithm flags nearby grievances in identical categories within 80 meters.
                      </p>

                      {selectedIssue.duplicate_candidates.length === 0 ? (
                        <div className="text-center text-text-muted py-6">
                          No duplicate reports detected within spatial threshold.
                        </div>
                      ) : (
                        selectedIssue.duplicate_candidates.map((cand) => (
                          <div
                            key={cand.candidate_id}
                            className="p-3 bg-surface-muted rounded-xl border border-surface-border space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-primary">
                                {cand.other_ticket_id}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  cand.relationship_status === 'CONFIRMED'
                                    ? 'bg-green-100 text-status-resolved'
                                    : cand.relationship_status === 'REJECTED'
                                    ? 'bg-red-100 text-status-critical'
                                    : 'bg-amber-100 text-status-medium'
                                }`}
                              >
                                {cand.relationship_status} ({cand.confidence_score.toFixed(0)}% Match)
                              </span>
                            </div>
                            <div className="text-xs text-text-main font-semibold">{cand.other_title}</div>

                            {/* Officer Confirm / Reject buttons */}
                            {isPrivileged && cand.relationship_status === 'CANDIDATE' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => confirmDupMutation.mutate(cand.candidate_id)}
                                  className="flex-1 bg-status-resolved hover:bg-green-700 text-white py-1 rounded-lg text-xs font-bold transition"
                                >
                                  Confirm Duplicate
                                </button>
                                <button
                                  onClick={() => rejectDupMutation.mutate(cand.candidate_id)}
                                  className="flex-1 bg-slate-300 hover:bg-slate-400 text-text-main py-1 rounded-lg text-xs font-bold transition"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </aside>
        )}

        {/* Panel Open Toggle Tab when panel is collapsed */}
        {!panelOpen && selectedIssueId && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-surface-border shadow-lg p-2 rounded-r-xl text-text-main hover:bg-surface-muted transition"
            aria-label="Open issue detail panel"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Leaflet Street Map Container */}
        <div className="flex-1 h-full relative">
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            {/* OpenStreetMap Tile Layer with accurate attribution */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <MapController center={mapCenter} />
            <MapClickHandler
              routeMode={routeMode}
              onAddPoint={(pt) => setRoutePoints((prev) => [...prev, pt])}
            />

            {/* Custom Inspection Route Polyline Preview */}
            {routePoints.length > 0 && (
              <Polyline
                positions={routePoints}
                color="#0F9D8A"
                weight={4}
                dashArray="6, 8"
              />
            )}

            {/* Render Map Issue Markers */}
            {mapIssues.map((issue) => {
              const isSelected = selectedIssueId === issue.id;
              const icon = createMarkerIcon(issue.category, issue.priority_score, isSelected);

              return (
                <Marker
                  key={issue.id}
                  position={[issue.latitude, issue.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleSelectIssue(issue),
                  }}
                >
                  <Popup className="custom-issue-popup">
                    <div className="p-1 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-primary">{issue.ticket_id}</span>
                        <span className="font-bold text-[10px] uppercase text-text-muted">
                          {issue.status}
                        </span>
                      </div>
                      <div className="font-bold text-navy-900">{issue.title}</div>
                      <div className="text-text-muted text-[11px]">{issue.address_text || issue.ward_name}</div>
                      <button
                        onClick={() => handleSelectIssue(issue)}
                        className="w-full mt-2 bg-navy-900 text-white py-1 rounded text-[11px] font-bold"
                      >
                        Inspect Dossier
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend (Bottom Right) */}
          <div className="absolute bottom-6 right-6 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-surface-border shadow-lg text-xs space-y-2 pointer-events-auto hidden md:block">
            <div className="font-bold text-navy-900 text-[11px] uppercase tracking-wider">
              Issue Category Pins
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => (
                <div key={c.key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[c.key] || '#3158D8' }}
                  />
                  <span className="text-text-muted">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
