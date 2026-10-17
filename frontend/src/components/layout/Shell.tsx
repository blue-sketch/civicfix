import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin,
  LayoutDashboard,
  Map as MapIcon,
  ListTodo,
  FileText,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  PlusCircle,
  Shield,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Menu,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch in-app notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.listNotifications(),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/issues?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  interface NavItem {
    to: string;
    label: string;
    icon: any;
    highlight?: boolean;
  }

  // Dynamic Navigation items based on role
  const getNavLinks = (): NavItem[] => {
    const role = user?.role || 'CITIZEN';

    const common: NavItem[] = [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/map', label: 'Live Issue Map', icon: MapIcon },
    ];

    if (role === 'CITIZEN') {
      return [
        ...common,
        { to: '/report', label: 'Report an Issue', icon: PlusCircle, highlight: true },
        { to: '/my-complaints', label: 'My Complaints', icon: FileText },
        { to: '/issues', label: 'Community Feed', icon: ListTodo },
      ];
    }


    // Officer & Admin
    return [
      ...common,
      { to: '/issues', label: 'All Issues', icon: ListTodo },
      { to: '/assignments', label: 'Assignments', icon: Briefcase },
      { to: '/report', label: 'Submit Issue', icon: PlusCircle },
      { to: '/analytics', label: 'Operations Analytics', icon: BarChart3 },
      { to: '/settings', label: 'Settings & Routes', icon: Settings },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-text-main font-sans antialiased">
      {/* Top Header - Dark Navy Operative Aesthetics (#171B35) */}
      <header className="bg-navy-900 border-b border-navy-700 text-white sticky top-0 z-50 px-4 lg:px-6 h-16 flex items-center justify-between shadow-md">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-teal-accent flex items-center justify-center text-white shadow-inner font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">CIVIC</span>
                <span className="font-extrabold text-lg tracking-tight text-teal-accent">FIX</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-navy-700 text-slate-300 px-1.5 py-0.5 rounded">
                  PUNE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block -mt-1 tracking-wide">
                Municipal Operations Platform
              </p>
            </div>
          </NavLink>
        </div>

        {/* Center: Search input */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID (e.g. TKT-2026-0001), keyword or street..."
              className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-primary transition"
            />
          </div>
        </form>

        {/* Right: Role Switcher & User profile & Notifications */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Quick Demo Role Switcher */}
          <div className="hidden sm:flex items-center bg-navy-800 border border-navy-700 rounded-lg p-0.5 text-xs">
            <span className="px-2 py-1 text-[11px] text-slate-400 font-medium">Role:</span>
            {(['CITIZEN', 'MUNICIPAL_OFFICER', 'ADMIN'] as UserRole[]).map((r) => {
              const active = user?.role === r;
              const labelMap: Record<UserRole, string> = {
                CITIZEN: 'Citizen',
                MUNICIPAL_OFFICER: 'Officer',
                ADMIN: 'Admin'
              };
              return (
                <button
                  key={r}
                  onClick={() => switchDemoRole(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-navy-700'
                  }`}
                  title={`Switch active demo session to ${labelMap[r]}`}
                >
                  {labelMap[r]}
                </button>
              );
            })}
          </div>

          {/* Quick New Report Action */}
          <NavLink
            to="/report"
            className="flex items-center gap-1.5 bg-teal-accent hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Issue</span>
          </NavLink>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-critical ring-2 ring-navy-900 animate-pulse" />
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-surface-border text-text-main py-2 z-50">
                <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-primary-light text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllMutation.mutate()}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) navigate(n.link);
                          setNotificationsOpen(false);
                        }}
                        className={`p-3.5 hover:bg-surface-muted transition cursor-pointer text-xs ${
                          !n.is_read ? 'bg-blue-50/60 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                          <span className="font-semibold text-text-main">{n.title}</span>
                          <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-text-muted leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-navy-800 transition"
            >
              <div className="w-7 h-7 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-teal-accent font-bold text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-medium text-white max-w-[120px] truncate">{user?.full_name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-surface-border text-text-main py-2 z-50">
                <div className="px-4 py-2 border-b border-surface-border">
                  <div className="font-semibold text-xs text-text-main">{user?.full_name}</div>
                  <div className="text-[11px] text-text-muted truncate">{user?.email}</div>
                  <div className="mt-1 inline-block text-[10px] uppercase font-bold tracking-wide bg-navy-900 text-white px-2 py-0.5 rounded">
                    {user?.role}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs text-status-critical hover:bg-red-50 font-medium transition"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-border transform lg:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col pt-16 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Ward Selector Badge */}
          <div className="p-4 border-b border-surface-border">
            <div className="bg-surface-muted border border-surface-border rounded-xl p-3">
              <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-1 flex items-center justify-between">
                <span>Current Jurisdiction</span>
                <span className="w-2 h-2 rounded-full bg-status-resolved"></span>
              </div>
              <div className="font-bold text-sm text-navy-900">Pune Municipal Corp</div>
              <div className="text-xs text-text-muted mt-0.5">6 Administrative Wards Active</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-sm'
                        : item.highlight
                        ? 'text-teal-accent hover:bg-teal-50'
                        : 'text-text-muted hover:text-text-main hover:bg-surface-muted'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer: System Status */}
          <div className="p-4 border-t border-surface-border text-[11px] text-text-muted bg-surface-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-text-main">PostGIS Spatial DB</span>
              <span className="text-status-resolved font-semibold">Active</span>
            </div>
            <div className="text-[10px] text-text-muted">
              OSM Tile Attribution Configured • Seed v1.0
            </div>
          </div>
        </aside>

        {/* Mobile Backdrop overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-navy-900/50 backdrop-blur-xs z-30 lg:hidden"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-surface-bg">
          {children}
        </main>
      </div>
    </div>
  );
};
