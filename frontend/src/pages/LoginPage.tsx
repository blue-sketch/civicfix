import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const roles: { value: UserRole; label: string }[] = [
  { value: 'CITIZEN', label: 'Citizen' },
  { value: 'MUNICIPAL_OFFICER', label: 'Municipal Officer' },
  { value: 'ADMIN', label: 'Admin' },
];

export const LoginPage: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const { user, isLoading, login, register, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialRole = roles.some(({ value }) => value === searchParams.get('role'))
    ? searchParams.get('role') as UserRole
    : 'CITIZEN';
  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true });
  }, [isLoading, user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const authenticatedUser = isRegister
        ? await register({ full_name: fullName, phone: phone || undefined, email, password, role })
        : await login(email, password);

      if (authenticatedUser.role !== role) {
        setError(`This account is registered as ${roles.find(({ value }) => value === authenticatedUser.role)?.label ?? authenticatedUser.role}. Choose that portal to sign in.`);
        // Do not leave a user signed into a portal that does not match their account.
        logout();
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10152d] px-4 py-10 text-slate-900">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
        <div className="bg-[#1a2142] px-7 py-8 text-center text-white sm:px-10">
          <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4"/> Back to CivicFix</Link>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400"><MapPin className="h-7 w-7"/></div>
          <h1 className="mt-4 text-3xl font-black">CIVIC FIX</h1>
          <p className="mt-2 text-sm text-slate-300">Pune Municipal Grievance &amp; Operations Platform</p>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 py-7 sm:px-8">
          <div><h2 className="text-xl font-bold">{isRegister ? 'Create your account' : 'Sign in to your portal'}</h2><p className="mt-1 text-sm text-slate-500">Choose the role for the dashboard you want to access.</p></div>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <fieldset><legend className="mb-2 text-sm font-semibold">Portal</legend><div className="grid grid-cols-3 gap-2">{roles.map(({ value, label }) => <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold sm:text-sm ${role === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}</div></fieldset>
          {isRegister && <>
            <label className="block text-sm font-semibold">Full name<input required autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500" placeholder="Your name"/></label>
            <label className="block text-sm font-semibold">Phone <span className="font-normal text-slate-400">(optional)</span><input autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500" placeholder="Phone number"/></label>
          </>}
          <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500" placeholder="you@example.com"/></label>
          <label className="block text-sm font-semibold">Password<input required type="password" minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500" placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}/></label>
          <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60">{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} {!busy && (isRegister ? <ArrowRight className="h-4 w-4"/> : <LockKeyhole className="h-4 w-4"/>)}</button>
          <p className="text-center text-sm text-slate-500">{isRegister ? 'Already have an account?' : 'New to CivicFix?'}{' '}<Link className="font-semibold text-blue-700 hover:underline" to={`/${isRegister ? 'login' : 'register'}?role=${role}`}>{isRegister ? 'Sign in' : 'Register'}</Link></p>
          {!isRegister && <p className="text-center text-xs text-slate-400">Demo accounts are available through your project administrator.</p>}
        </form>
      </div>
    </main>
  );
};
