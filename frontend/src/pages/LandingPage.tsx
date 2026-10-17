import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, Compass, FileText, Github, MapPin, ShieldCheck, Users } from 'lucide-react';
import { UserRole } from '../types';

const portals: { role: UserRole; title: string; description: string; icon: React.ElementType }[] = [
  { role: 'CITIZEN', title: 'Citizen Portal', description: 'Report neighborhood problems, attach evidence, and follow every update.', icon: Users },
  { role: 'MUNICIPAL_OFFICER', title: 'Officer Portal', description: 'Review your department’s work queue and keep residents informed.', icon: ClipboardList },
  { role: 'ADMIN', title: 'Admin Portal', description: 'Coordinate city operations, verify reports, and review performance.', icon: BarChart3 },
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-[#10152d] text-slate-100">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10152d]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8" aria-label="Main navigation">
        <a href="#home" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-400"><MapPin className="h-5 w-5"/></span>
          <span className="text-lg font-black tracking-wide">CIVIC<span className="text-teal-300">FIX</span></span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <a href="#about" className="hover:text-white">About</a><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#portals" className="hover:text-white">Portals</a>
        </div>
        <Link to="/login" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:border-teal-300 hover:text-teal-200">Sign in</Link>
      </nav>
    </header>

    <main>
      <section id="home" className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,rgba(15,157,138,.24),transparent_42%),radial-gradient(ellipse_at_15%_85%,rgba(49,88,216,.27),transparent_45%)]"/>
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-28 lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold text-teal-200"><MapPin className="h-3.5 w-3.5"/> Pune · Civic issue response</div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">A better way to make your city <span className="text-teal-300">work for everyone.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">CivicFix connects residents and municipal teams so local problems are reported clearly, routed to the right people, and tracked through resolution.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#portals" className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 font-bold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-400">Choose your portal <ArrowRight className="h-4 w-4"/></a><a href="#how-it-works" className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-200 hover:bg-white/5">See how it works</a></div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-400"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-300"/> Role-based access</span><span className="flex items-center gap-2"><Compass className="h-4 w-4 text-blue-300"/> Location-aware reporting</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-300"/> Trackable progress</span></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#1a2142]/80 p-5 shadow-2xl shadow-black/30 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs uppercase tracking-[.18em] text-teal-300">One shared process</p><h2 className="mt-1 text-lg font-bold">From report to resolution</h2></div><span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><ClipboardList/></span></div>
            <div className="mt-5 space-y-3">{[['01','Report','Describe the issue and mark where it happened.'],['02','Route','The right municipal team reviews and takes ownership.'],['03','Resolve','Follow progress, evidence, and the final sign-off.']].map(([n,title,copy])=><div key={n} className="flex gap-4 rounded-2xl border border-white/5 bg-white/[.03] p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-sm font-bold text-teal-300">{n}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p></div></div>)}</div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#111833] p-4"><span className="h-2.5 w-2.5 rounded-full bg-teal-400 shadow-[0_0_14px_rgba(45,212,191,.8)]"/><p className="text-sm text-slate-300">Every update helps build a clearer picture of city needs.</p></div>
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-white/5 bg-[#151b37]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:items-center lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">What CivicFix does</p><h2 className="mt-3 text-3xl font-bold">Local issues deserve a visible path to action.</h2></div>
          <p className="text-base leading-7 text-slate-300">CivicFix brings reporting, location context, department assignments, field updates, and resolution review into one place. Residents can see what is happening with their reports, while municipal staff get a shared workflow for prioritizing and closing the loop.</p>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">How it works</p><h2 className="mt-3 text-3xl font-bold">Clear steps for everyone involved.</h2><p className="mt-3 text-slate-400">Each role sees the tools and information needed for its part of the process.</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">{[{icon:FileText,title:'Report with context',body:'Share a description, category, location, and photos so teams can understand the issue.'},{icon:Users,title:'Coordinate the response',body:'Reports move through verification, department assignment, and field work with a visible timeline.'},{icon:CheckCircle2,title:'Confirm the outcome',body:'Resolution evidence and certification give the work a clear, reviewable finish.'}].map(({icon:Icon,title,body})=><article key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><span className="inline-flex rounded-xl bg-teal-300/10 p-3 text-teal-300"><Icon className="h-5 w-5"/></span><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></article>)}</div>
      </section>

      <section id="portals" className="bg-[#151b37] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">Get started</p><h2 className="mt-3 text-3xl font-bold">Choose your CivicFix portal</h2><p className="mt-3 text-slate-400">Sign in to your account or create one for the dashboard you need.</p></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">{portals.map(({role,title,description,icon:Icon})=><article key={role} className="flex flex-col rounded-2xl border border-white/10 bg-[#1b2242] p-6 transition hover:-translate-y-1 hover:border-teal-300/40"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300"><Icon className="h-6 w-6"/></span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p><div className="mt-6 flex gap-3"><Link to={`/login?role=${role}`} className="flex-1 rounded-lg bg-teal-500 px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-teal-400">Sign in</Link><Link to={`/register?role=${role}`} className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 text-center text-sm font-semibold hover:border-white/40">Register</Link></div></article>)}</div>
        </div>
      </section>
    </main>

    <footer className="border-t border-white/10 bg-[#0c1125]">
      <div className="mx-auto grid max-w-7xl gap-9 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2"><a href="#home" className="flex items-center gap-2 font-black tracking-wide"> <MapPin className="h-5 w-5 text-teal-300"/> CIVIC<span className="-ml-2 text-teal-300">FIX</span></a><p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">A shared civic issue reporting and response platform for residents and municipal teams.</p></div>
        <div><h2 className="text-sm font-bold">Explore</h2><div className="mt-3 flex flex-col gap-2 text-sm text-slate-400"><a href="#about" className="hover:text-white">About CivicFix</a><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#portals" className="hover:text-white">Portals</a></div></div>
        <div><h2 className="text-sm font-bold">Account</h2><div className="mt-3 flex flex-col gap-2 text-sm text-slate-400"><Link to="/login" className="hover:text-white">Sign in</Link><Link to="/register" className="hover:text-white">Create account</Link><a href="mailto:support@civicfix.org" className="hover:text-white">Contact support</a></div></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} CivicFix · Pune Municipal Grievance & Operations Platform</span><a href="https://github.com/blue-sketch/civicfix" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-slate-300"><Github className="h-4 w-4"/> Project repository</a></div></div>
    </footer>
  </div>
);
