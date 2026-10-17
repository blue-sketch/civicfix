import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Shield, User, Briefcase, Lock, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    try {
      await switchDemoRole(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-navy-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Banner */}
        <div className="bg-navy-800 p-6 text-center text-white border-b border-navy-700">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-teal-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">CIVIC FIX</h1>
          <p className="text-xs text-slate-400 mt-1">
            Pune Municipal Grievance & Operations Platform
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-status-critical rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick Demo Login Cards */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider text-center">
              1-Click Instant Demo Login
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('CITIZEN')}
                className="p-2.5 rounded-xl border border-surface-border bg-surface-muted hover:bg-blue-50 hover:border-primary transition text-left text-xs group"
              >
                <div className="font-bold text-navy-900 group-hover:text-primary">Citizen</div>
                <div className="text-[10px] text-text-muted">Report & Track</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('MUNICIPAL_OFFICER')}
                className="p-2.5 rounded-xl border border-surface-border bg-surface-muted hover:bg-blue-50 hover:border-primary transition text-left text-xs group"
              >
                <div className="font-bold text-navy-900 group-hover:text-primary">Officer</div>
                <div className="text-[10px] text-text-muted">Verify & Dispatch</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('FIELD_WORKER')}
                className="p-2.5 rounded-xl border border-surface-border bg-surface-muted hover:bg-blue-50 hover:border-primary transition text-left text-xs group"
              >
                <div className="font-bold text-navy-900 group-hover:text-primary">Field Worker</div>
                <div className="text-[10px] text-text-muted">Execute & Resolve</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2.5 rounded-xl border border-surface-border bg-surface-muted hover:bg-blue-50 hover:border-primary transition text-left text-xs group"
              >
                <div className="font-bold text-navy-900 group-hover:text-primary">Administrator</div>
                <div className="text-[10px] text-text-muted">Analytics & Audit</div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-surface-border w-full" />
            <span className="bg-white px-3 text-[10px] text-text-muted uppercase font-semibold">Or Sign In Manually</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-navy-900 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@civicfix.org"
                className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-muted border border-surface-border rounded-xl p-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
