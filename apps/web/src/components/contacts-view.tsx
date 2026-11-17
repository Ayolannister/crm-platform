'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight, BarChart3, Check, ChevronRight, Download, KeyRound,
  LayoutDashboard, LogOut, Mail, Menu, Database, LockKeyhole,
  Pencil, Phone, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Trash2, Users, X
} from 'lucide-react';

type Contact = { id?: string; firstName: string; lastName?: string | null; email?: string | null; phone?: string | null };
type FormValues = { firstName: string; lastName: string; email: string; phone: string };
type View = 'overview' | 'contacts' | 'analytics' | 'settings';
const empty: FormValues = { firstName: '', lastName: '', email: '', phone: '' };

export default function ContactsView({ initialContacts, error }: { initialContacts: Contact[]; error: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compactRows, setCompactRows] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompactRows(window.localStorage.getItem('infiniti-compact-rows') === 'true');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function toggleCompactRows() {
    setCompactRows(value => {
      window.localStorage.setItem('infiniti-compact-rows', String(!value));
      return !value;
    });
  }
  function exportContacts() {
    if (!initialContacts.length) return;
    const safe = (value: string | null | undefined) => {
      const str = value ?? '';
      // Defuse spreadsheet formulas and escape RFC-4180 CSV fields.
      const escaped = /^[\s]*[=+@\-\t\r]/.test(str) ? "'" + str : str;
      return '"' + escaped.replace(/"/g, '""') + '"';
    };
    const rows = [
      ['First name', 'Last name', 'Email', 'Phone'],
      ...initialContacts.map(c => [c.firstName, c.lastName, c.email, c.phone])
    ];
    const csv = rows.map(row => row.map(safe).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'infiniti-contacts.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Your contacts have been exported.');
  }

  const contacts = useMemo(() => initialContacts.filter(c =>
    [c.firstName, c.lastName, c.email, c.phone].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  ), [initialContacts, query]);
  const total = initialContacts.length;
  const emailCount = initialContacts.filter(c => !!c.email).length;
  const phoneCount = initialContacts.filter(c => !!c.phone).length;
  const completeCount = initialContacts.filter(c => !!c.email && !!c.phone).length;
  const completeness = total ? Math.round(completeCount / total * 100) : 0;
  const initials = (c: Contact) => (c.firstName.slice(0, 1) + (c.lastName?.slice(0, 1) ?? '')).toUpperCase() || '?';
  const fullName = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ');
  const recent = initialContacts.slice(0, 5);
  const letterGroups = useMemo(() => {
    const map = new Map<string, number>();
    initialContacts.forEach(c => {
      const key = (c.firstName[0] || '#').toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 12);
  }, [initialContacts]);
  const maxGroup = Math.max(1, ...letterGroups.map(([, count]) => count));

  function go(next: View) { setView(next); setSidebarOpen(false); setQuery(''); }
  function showCreate() { setMode('create'); setSelected(null); setValues(empty); setMessage(''); }
  function showEdit(c: Contact) {
    setMode('edit'); setSelected(c);
    setValues({ firstName: c.firstName, lastName: c.lastName ?? '', email: c.email ?? '', phone: c.phone ?? '' });
    setMessage('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('');
    const payload = {
      firstName: values.firstName.trim(),
      ...(mode === 'edit' ? {
        lastName: values.lastName.trim() || null, email: values.email.trim() || null, phone: values.phone.trim() || null
      } : {
        ...(values.lastName.trim() ? { lastName: values.lastName.trim() } : {}),
        ...(values.email.trim() ? { email: values.email.trim() } : {}),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {})
      })
    };
    if (mode === 'edit' && !selected?.id) { setMessage('Contact ID is missing'); setSaving(false); return; }
    try {
      const res = await fetch(mode === 'edit' ? `/api/contacts/${selected!.id}` : '/api/contacts', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) {
        const m = body.message;
        setMessage(Array.isArray(m) ? m.join(', ') : m || 'Unable to save contact');
        return;
      }
      setMode(null); setMessage(mode === 'edit' ? 'Contact updated successfully.' : 'Contact created successfully.');
      router.refresh();
    } catch { setMessage('Could not reach the server.'); }
    finally { setSaving(false); }
  }
  async function remove(c: Contact) {
    if (!c.id || !window.confirm(`Delete ${fullName(c)}? This cannot be undone.`)) return;
    setBusyId(c.id); setMessage('');
    try {
      const res = await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        const m = body.message;
        setMessage(Array.isArray(m) ? m.join(', ') : m || 'Unable to delete contact');
      } else { setMessage('Contact deleted successfully.'); router.refresh(); }
    } catch { setMessage('Could not reach the server.'); }
    finally { setBusyId(null); }
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login'); router.refresh();
  }

  const navigation: { id: View; name: string; icon: typeof Users }[] = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const directory = (
    <section id="contacts" className="inf-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 px-6 py-6">
        <div><h2 className="text-lg font-semibold text-white">Contacts directory</h2>
          <p className="mt-1 text-xs text-zinc-500">{total} contacts in your workspace</p></div>
        <div className="relative w-full sm:w-64"><Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-zinc-500" />
          <input aria-label="Search contacts" className="inf-input pl-10!" placeholder="Search contacts..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>
      {error ? <div className="p-8 text-sm text-rose-400" role="alert">{error}</div> :
        contacts.length === 0 ?
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="mb-4 rounded-2xl bg-lime-400/10 p-4 text-lime-300"><Users size={26} /></span>
          <h3 className="font-semibold text-white">{query ? 'No matching contacts' : 'Your network starts here'}</h3>
          <p className="mt-2 max-w-xs text-sm text-zinc-500">{query ? 'Try a different name, email or phone number.' : 'Add your first contact to build your workspace.'}</p>
          {!query && <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b9ff45] px-5 py-3 text-sm font-bold text-[#101010] shadow-[0_8px_24px_rgba(185,255,69,0.12)] transition hover:bg-[#d0ff7f]" onClick={showCreate}><Plus size={18} strokeWidth={2.5} /> Add your first contact</button>}
        </div> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-widest text-zinc-500"><th className="px-6 py-4 font-medium">Contact</th><th className="py-4 font-medium">Email</th><th className="py-4 font-medium">Phone</th><th className="py-4 font-medium">Profile</th><th className="py-4 pr-6 text-right font-medium">Actions</th></tr></thead>
            <tbody>{contacts.map((c, i) => <tr key={c.id ?? i} className="border-t border-white/7 transition-colors hover:bg-white/4">
              <td className={compactRows ? 'px-6 py-2' : 'px-6 py-4'}><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-xs font-bold text-lime-300">{initials(c)}</span><span className="font-medium text-zinc-100">{fullName(c)}</span></div></td>
              <td className="pr-5 text-zinc-400">{c.email || '—'}</td><td className="pr-5 text-zinc-400">{c.phone || '—'}</td>
              <td><span className={c.email && c.phone ? 'inf-tag-success' : 'inf-tag-muted'}>{c.email && c.phone ? 'Complete' : 'Partial'}</span></td>
              <td className="space-x-2 whitespace-nowrap py-3 pr-6 text-right">
                <button aria-label={`Edit ${fullName(c)}`} onClick={() => showEdit(c)} className="inf-icon-button"><Pencil size={16}/></button>
                <button aria-label={`Delete ${fullName(c)}`} disabled={busyId === c.id} onClick={() => remove(c)} className="inf-icon-button text-rose-400 hover:border-rose-400/50 disabled:opacity-40"><Trash2 size={16}/></button>
              </td>
            </tr>)}</tbody>
          </table>
        </div>}
    </section>
  );

  return (
    <div className="min-h-screen bg-[#090909] text-zinc-100 lg:flex">
      {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/8 bg-[#101010] px-5 py-7 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9ff45] text-xl font-black text-[#101010]">∞</span><span className="text-2xl font-bold tracking-tight">infiniti<span className="text-[#b9ff45]">.</span></span></div>
          <button aria-label="Close sidebar" className="text-zinc-400 lg:hidden" onClick={() => setSidebarOpen(false)}><X size={20}/></button>
        </div>
        <div className="mx-2 mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Workspace</div>
        <nav className="mt-4 space-y-1" aria-label="Main navigation">
          {navigation.map(item => <button key={item.id} onClick={() => go(item.id)} aria-current={view === item.id ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all ${view === item.id ? 'bg-[#b9ff45] font-semibold text-[#111]' : 'text-zinc-400 hover:bg-white/6 hover:text-white'}`}>
            <item.icon size={18}/>{item.name}
          </button>)}
        </nav>
        <div className="mt-auto">
          <div className="inf-card mb-5 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#b9ff45]"><ShieldCheck size={15}/> Private workspace</div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Your contacts are isolated to your organization.</p></div>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 hover:bg-white/6 hover:text-white"><LogOut size={18}/> Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 pb-12 pt-6 md:px-9 lg:px-12">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="inf-icon-button lg:hidden" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button>
            <span className="hidden text-xs font-medium tracking-wide text-zinc-500 sm:block">WORKSPACE <span className="mx-2 text-zinc-700">/</span> <span className="text-zinc-300">{navigation.find(n => n.id === view)?.name}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#151515] px-3 py-2 text-xs text-zinc-400 sm:flex"><span className="h-2 w-2 rounded-full bg-[#b9ff45]"/> Workspace online</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/10 text-sm font-bold text-lime-300" aria-label="Workspace profile">IN</div>
          </div>
        </header>

        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b9ff45]">Infiniti / {view}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{view === 'overview' ? 'Your network, in focus.' : view === 'contacts' ? 'Your contacts' : view === 'analytics' ? 'Workspace analytics' : 'Settings'}</h1>
            <p className="mt-2 text-sm text-zinc-500">{view === 'overview' ? 'A clearer view of the relationships you are building.' : view === 'contacts' ? 'Every relationship, all in one place.' : view === 'analytics' ? 'Insights from your real contact data.' : 'Workspace preferences and configuration.'}</p></div>
          {view !== 'settings' && <button
            type="button" onClick={showCreate}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-2xl border border-[#b9ff45] bg-[#b9ff45] px-5 py-3 text-sm font-bold text-[#101010] shadow-[0_8px_24px_rgba(185,255,69,0.18)] transition hover:-translate-y-0.5 hover:bg-[#d0ff7f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b9ff45]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/10"><Plus size={18} strokeWidth={2.7} aria-hidden="true"/></span>
            New contact
          </button>}
        </div>
        {message && !mode && <div role="status" className="mb-5 flex items-center gap-3 rounded-xl border border-[#b9ff45]/25 bg-[#b9ff45]/8 px-4 py-3 text-sm text-lime-200"><Check size={17}/>{message}<button className="ml-auto" aria-label="Dismiss notice" onClick={() => setMessage('')}><X size={16}/></button></div>}

        {view !== 'settings' && <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ name: 'Total contacts', value: total, icon: Users, sub: 'Across your workspace' }, { name: 'With email', value: emailCount, icon: Mail, sub: total ? `${Math.round(emailCount / total * 100)}% of contacts` : 'No contacts yet' }, { name: 'With phone', value: phoneCount, icon: Phone, sub: total ? `${Math.round(phoneCount / total * 100)}% of contacts` : 'No contacts yet' }, { name: 'Complete profiles', value: completeCount, icon: ShieldCheck, sub: `${completeness}% of contacts` }].map((stat, i) =>
            <div className="inf-card group p-5 transition-colors hover:border-[#b9ff45]/25" key={stat.name}>
              <div className="mb-7 flex items-center justify-between"><span className="text-sm text-zinc-400">{stat.name}</span><stat.icon size={19} className={i === 0 ? 'text-[#b9ff45]' : 'text-zinc-500'}/></div>
              <div className="text-4xl font-semibold tracking-tight text-white">{stat.value.toLocaleString()}</div>
              <p className="mt-3 text-xs text-zinc-500">{stat.sub}</p>
            </div>
          )}
        </div>}

        {view === 'overview' && <>
          <div className="mb-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <section className="inf-card flex min-h-78 flex-col p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-zinc-400">Contacts at a glance</p><h2 className="mt-2 text-2xl font-semibold text-white">Your contact mix</h2><p className="mt-2 text-xs text-zinc-500">Grouped by first letter · live workspace data</p></div><span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-semibold text-[#b9ff45]">{total} total</span></div>
              <div className="mt-auto pt-8">{letterGroups.length ?
                <div className="flex h-42 items-end gap-2 sm:gap-3">{letterGroups.map(([letter, count], index) => <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={letter} title={`${letter}: ${count} contacts`}>
                  <div className={`w-full max-w-10 rounded-t-md transition-all hover:brightness-125 ${index % 3 === 1 ? 'bg-[#9c83be]' : index % 3 === 2 ? 'bg-[#7c9f40]' : 'bg-[#b9ff45]'}`} style={{height: `${Math.max(14, count / maxGroup * 145)}px`}} />
                  <span className="text-[10px] text-zinc-500">{letter}</span>
                </div>)}</div> :
                <div className="flex h-42 items-center justify-center text-sm text-zinc-600">Add contacts to populate your chart.</div>}</div>
            </section>
            <section className="inf-card flex flex-col justify-between p-6">
              <div><p className="text-sm text-zinc-400">Contact quality</p><h2 className="mt-2 text-2xl font-semibold text-white">Profile completeness</h2></div>
              <div className="my-7"><div className="flex items-baseline gap-2"><span className="text-6xl font-semibold tracking-tight text-[#b9ff45]">{completeness}</span><span className="text-3xl text-[#b9ff45]">%</span></div><p className="mt-2 text-sm text-zinc-500">Contacts with both email and phone</p></div>
              <div><div className="h-3 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#b9ff45] transition-all" style={{width: `${completeness}%`}} /></div><p className="mt-4 flex justify-between text-xs text-zinc-500"><span>{completeCount} complete</span><span>{total - completeCount} incomplete</span></p></div>
            </section>
          </div>
          <div className="mb-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <section className="inf-card p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-zinc-400">Your contacts</p><h2 className="mt-2 text-xl font-semibold text-white">Recently listed</h2></div><button onClick={() => go('contacts')} className="flex items-center gap-1 text-xs text-[#b9ff45] hover:underline">View all <ChevronRight size={15}/></button></div>
              {recent.length ? <div className="mt-5 space-y-1">{recent.map((c, i) => <div className="flex items-center gap-3 rounded-xl px-1 py-3" key={c.id ?? i}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/7 text-xs font-semibold text-[#b9ff45]">{initials(c)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-100">{fullName(c)}</p><p className="truncate text-xs text-zinc-500">{c.email || 'No email added'}</p></div>
                <button className="inf-icon-button" aria-label={`Edit ${fullName(c)}`} onClick={() => showEdit(c)}><Pencil size={15}/></button>
              </div>)}</div> : <p className="py-12 text-center text-sm text-zinc-500">Your recent contacts will appear here.</p>}
            </section>
            <section className="inf-card relative overflow-hidden bg-[#b9ff45] p-6 text-[#121a08]">
              <div className="relative z-10"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Infiniti insights</p><span className="rounded-full bg-[#121a08]/10 px-3 py-1 text-xs font-semibold"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#121a08]"/> Live</span></div>
                <h2 className="mt-10 text-4xl font-semibold tracking-tight">{total ? Math.round(emailCount / total * 100) : 0}%</h2>
                <p className="mt-2 text-sm">Email coverage</p>
                <p className="mt-6 max-w-60 text-xs leading-6 text-[#121a08]/65">Build stronger relationships by keeping contact information up to date.</p>
                <button className="mt-7 flex items-center gap-2 rounded-full bg-[#121a08] px-5 py-3 text-xs font-semibold text-white" onClick={() => go('contacts')}>Explore contacts <ArrowUpRight size={15}/></button>
              </div><div className="pointer-events-none absolute -bottom-16 -right-20 h-56 w-56 rounded-full border-30 border-black/5"/></section>
          </div>
          {directory}
        </>}

        {view === 'contacts' && directory}
        {view === 'analytics' && <div className="grid gap-5 lg:grid-cols-2">
          <div className="inf-card p-7"><p className="text-sm text-zinc-400">Reachability</p><h2 className="mt-2 text-2xl font-semibold">Ways to connect</h2>
            <div className="mt-9 space-y-6">{[{label:'Email available', count: emailCount, color:'#b9ff45'}, {label:'Phone available', count: phoneCount, color:'#ab91d8'}, {label:'Both available', count:completeCount, color:'#8ea65b'}].map(row => <div key={row.label}><div className="mb-2 flex justify-between text-xs text-zinc-400"><span>{row.label}</span><span>{row.count} / {total}</span></div><div className="h-3 rounded-full bg-white/8"><div className="h-3 rounded-full" style={{width:`${total ? row.count / total * 100 : 0}%`,backgroundColor:row.color}} /></div></div>)}</div>
            <p className="mt-8 text-xs text-zinc-500">Computed from current contacts. Historical trends are not available from the API.</p></div>
          <div className="inf-card p-7"><p className="text-sm text-zinc-400">Organization data</p><h2 className="mt-2 text-2xl font-semibold">Quality overview</h2><div className="mt-12 flex items-center justify-center"><div className="flex h-48 w-48 flex-col items-center justify-center rounded-full border-14 border-[#b9ff45] bg-[#b9ff45]/6"><span className="text-4xl font-semibold">{completeness}%</span><span className="mt-2 text-xs text-zinc-500">Complete profiles</span></div></div></div>
        </div>}
        {view === 'settings' && <div className="grid max-w-5xl gap-5">
          <section className="rounded-[26px] border border-white/12 bg-[#171717] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45]/12 text-[#b9ff45]"><Database size={22}/></span>
              <div><h2 className="text-xl font-semibold text-white">Your data</h2><p className="mt-1 text-xs text-zinc-500">Manage the contacts in your workspace</p></div></div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#202020] p-5">
              <div><p className="text-sm font-semibold text-white">Export contacts to CSV</p><p className="mt-2 max-w-md text-xs leading-5 text-zinc-400">Download your {total} current contacts with name, email and phone. Suitable for spreadsheets and backups.</p></div>
              <button type="button" onClick={exportContacts} disabled={!total}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b9ff45] px-4 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-[#d0ff7f] disabled:cursor-not-allowed disabled:opacity-40"><Download size={17}/> Export CSV</button>
            </div>
          </section>
          <section className="rounded-[26px] border border-white/12 bg-[#171717] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45]/12 text-[#b9ff45]"><SlidersHorizontal size={22}/></span>
              <div><h2 className="text-xl font-semibold text-white">Display preferences</h2><p className="mt-1 text-xs text-zinc-500">Saved in this browser</p></div></div>
            <label className="flex cursor-pointer items-center justify-between gap-5 rounded-2xl border border-white/10 bg-[#202020] p-5">
              <span><span className="block text-sm font-semibold text-white">Compact contacts table</span><span className="mt-2 block text-xs text-zinc-400">Use tighter spacing to fit more contacts on screen.</span></span>
              <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${compactRows ? 'bg-[#b9ff45]' : 'bg-zinc-600'}`}>
                <input type="checkbox" checked={compactRows} onChange={toggleCompactRows} className="peer sr-only" aria-label="Compact contacts table"/>
                <span className={`pointer-events-none ml-1 block h-5 w-5 rounded-full bg-[#141414] transition-transform ${compactRows ? 'translate-x-5' : ''}`}/>
              </span>
            </label>
          </section>
          <section className="rounded-[26px] border border-white/12 bg-[#171717] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45]/12 text-[#b9ff45]"><LockKeyhole size={22}/></span>
              <div><h2 className="text-xl font-semibold text-white">Security & session</h2><p className="mt-1 text-xs text-zinc-500">Current workspace security</p></div></div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#202020] p-5">
              <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 text-[#b9ff45]"/><div><p className="text-sm font-semibold text-white">Organization-isolated contacts</p><p className="mt-2 max-w-lg text-xs leading-5 text-zinc-400">The API scopes contact reads and changes to your organization. Sessions use an HTTP-only cookie with a short-lived token.</p></div></div>
              <button type="button" onClick={logout} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/6 px-4 text-sm font-semibold text-white hover:border-white/30"><LogOut size={17}/> Sign out</button>
            </div>
          </section>
          <section className="rounded-[26px] border border-white/12 bg-[#171717] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45]/12 text-[#b9ff45]"><KeyRound size={22}/></span>
              <div><h2 className="text-xl font-semibold text-white">Developer & organization settings</h2><p className="mt-1 text-xs text-zinc-500">Planned integrations · no API endpoints available yet</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[['API keys & scopes', 'Create and rotate scoped API credentials'],['Webhooks', 'Receive secure contact event notifications'],['Organization & members', 'Manage roles and team invitations'],['Audit history', 'Review who changed contacts and when']].map(([title,description]) =>
                <div className="rounded-2xl border border-white/8 bg-[#202020] p-5" key={title}>
                  <span className="inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-zinc-400">Coming soon</span>
                  <p className="mt-4 text-sm font-semibold text-zinc-200">{title}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
                </div>)}
            </div>
          </section>
        </div>}
      </main>

      {mode && <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-md sm:py-12"
        role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setMode(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="infiniti-contact-dialog-title"
          className="my-auto w-full max-w-135 overflow-hidden rounded-[28px] border border-[#363636] bg-[#1b1b1b] text-white shadow-[0_30px_100px_rgba(0,0,0,.85)]"
          style={{backgroundColor:'#1b1b1b', border:'1px solid #363636', borderRadius:28, boxShadow:'0 30px 100px rgba(0,0,0,.85)'}}>
          <div className="flex items-start justify-between border-b border-white/10 px-6 py-6 sm:px-8">
            <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9ff45]">INFINITI / CONTACTS</p>
              <h2 id="infiniti-contact-dialog-title" className="text-2xl font-semibold tracking-tight text-white">{mode === 'edit' ? 'Edit contact' : 'Add a new contact'}</h2>
              <p className="mt-2 text-sm text-zinc-400">{mode === 'edit' ? 'Update the details for this contact.' : 'Keep the important details in one place.'}</p>
            </div>
            <button type="button" onClick={() => setMode(null)} aria-label="Close dialog" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#282828] text-zinc-300 hover:bg-[#363636]"><X size={20}/></button>
          </div>
          <form onSubmit={submit} className="px-6 py-7 sm:px-8">
            <div className="grid gap-5">
              {(['firstName','lastName','email','phone'] as const).map(name => {
                const label = ({firstName:'First name',lastName:'Last name',email:'Email address',phone:'Phone number'} as const)[name];
                const hint = ({firstName:'e.g. Sarah',lastName:'e.g. Connor',email:'sarah@company.com',phone:'+234 800 000 0000'} as const)[name];
                return <div key={name} className="flex flex-col gap-2">
                  <label htmlFor={`contact-${name}`} className="text-[13px] font-semibold text-zinc-200">
                    {label}{name === 'firstName' ? <span className="ml-1 text-[#b9ff45]">*</span> : <span className="ml-2 text-xs font-normal text-zinc-500">Optional</span>}
                  </label>
                  <input id={`contact-${name}`} name={name} className="block h-12 w-full rounded-xl border border-[#424242] bg-[#242424] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#b9ff45] focus:ring-2 focus:ring-[#b9ff45]/20"
                    style={{backgroundColor:'#242424', border:'1px solid #424242', color:'#ffffff', borderRadius:12, minHeight:48, padding:'12px 16px', width:'100%'}}
                    required={name === 'firstName'} autoComplete={name === 'firstName' ? 'given-name' : name === 'lastName' ? 'family-name' : name === 'email' ? 'email' : 'tel'}
                    type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} placeholder={hint}
                    minLength={name === 'phone' ? 3 : undefined} maxLength={name === 'firstName' || name === 'lastName' ? 100 : name === 'phone' ? 30 : undefined}
                    value={values[name]} onChange={e => setValues(v => ({...v,[name]:e.target.value}))}/>
                </div>;
              })}
            </div>
            {message && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{message}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setMode(null)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#444] bg-[#2b2b2b] px-6 text-sm font-semibold text-white hover:bg-[#393939]"
                style={{border:'1px solid #444', borderRadius:12, backgroundColor:'#2b2b2b', padding:'12px 24px'}}>Cancel</button>
              <button type="submit" disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b9ff45] bg-[#b9ff45] px-6 text-sm font-bold text-[#101010] transition hover:bg-[#d0ff7f] disabled:cursor-wait disabled:opacity-60"
                style={{backgroundColor:'#b9ff45', color:'#101010', borderRadius:12, padding:'12px 24px', border:'1px solid #b9ff45'}}>
                {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create contact'} <Check size={17} strokeWidth={2.5}/>
              </button>
            </div>
          </form>
        </section>
      </div>}
    </div>
  );
}
