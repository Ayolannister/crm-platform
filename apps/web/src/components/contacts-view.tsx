'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Plus, Search, LogOut, Pencil, Trash2, Mail, Phone, X } from 'lucide-react';

type Contact = {
  id?: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};
type FormValues = { firstName: string; lastName: string; email: string; phone: string };
const empty: FormValues = { firstName: '', lastName: '', email: '', phone: '' };

export default function ContactsView({ initialContacts, error }: {
  initialContacts: Contact[]; error: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const contacts = useMemo(() => initialContacts.filter(c =>
    [c.firstName, c.lastName, c.email, c.phone].join(' ').toLowerCase()
      .includes(query.trim().toLowerCase())), [initialContacts, query]);
  const emailCount = initialContacts.filter(c => c.email).length;
  const phoneCount = initialContacts.filter(c => c.phone).length;

  function showCreate() { setMode('create'); setSelected(null); setValues(empty); setMessage(''); }
  function showEdit(contact: Contact) {
    setMode('edit'); setSelected(contact);
    setValues({ firstName: contact.firstName, lastName: contact.lastName ?? '',
      email: contact.email ?? '', phone: contact.phone ?? '' });
    setMessage('');
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setMessage('');
    const payload = {
      firstName: values.firstName.trim(),
      ...(mode === 'edit' ? { lastName: values.lastName.trim() || null, email: values.email.trim() || null, phone: values.phone.trim() || null } : {
        ...(values.lastName.trim() ? { lastName: values.lastName.trim() } : {}),
        ...(values.email.trim() ? { email: values.email.trim() } : {}),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      }),
    };
    if (mode === 'edit' && !selected?.id) {
      setMessage('Contact ID is missing'); setSaving(false); return;
    }
    const path = mode === 'edit' ? `/api/contacts/${selected!.id}` : '/api/contacts';
    try {
      const res = await fetch(path, { method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) {
        const m = body.message;
        setMessage(Array.isArray(m) ? m.join(', ') : m || 'Unable to save contact');
        return;
      }
      setMode(null); setMessage(mode === 'edit' ? 'Contact updated' : 'Contact added');
      router.refresh();
    } catch { setMessage('Could not reach the server'); }
    finally { setSaving(false); }
  }
  async function remove(contact: Contact) {
    if (!contact.id || !window.confirm(`Delete ${contact.firstName} ${contact.lastName ?? ''}? This cannot be undone.`)) return;
    setBusyId(contact.id); setMessage('');
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        setMessage(body.message || 'Unable to delete contact');
      } else {
        setMessage('Contact deleted'); router.refresh();
      }
    } catch { setMessage('Could not reach the server'); }
    finally { setBusyId(null); }
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login'); router.refresh();
  }
  const field = (name: keyof FormValues, label: string, type = 'text') => (
    <label className="block text-sm font-medium text-slate-700" key={name}>{label}
      <input className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        required={name === 'firstName'} type={type}
        minLength={name === 'phone' ? 3 : undefined}
        maxLength={name === 'firstName' || name === 'lastName' ? 100 : name === 'phone' ? 30 : undefined}
        value={values[name]} onChange={e => setValues(v => ({ ...v, [name]: e.target.value }))} />
    </label>
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="flex flex-col bg-slate-950 px-6 py-7 text-white md:min-h-screen md:w-64">
        <div className="mb-10 flex items-center gap-3 text-xl font-bold"><span className="rounded-xl bg-indigo-500 px-3 py-2">C</span> CRM Platform</div>
        <nav className="space-y-2 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-indigo-600 px-4 py-3"><LayoutDashboard size={18}/> Overview</div>
          <a href="#contacts" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800"><Users size={18}/> Contacts</a>
        </nav>
        <button onClick={logout} className="mt-8 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 md:mt-auto"><LogOut size={18}/> Log out</button>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Workspace overview</p>
            <h1 className="mt-2 text-3xl font-bold">Your contacts</h1>
            <p className="mt-1 text-slate-500">Manage relationships in your organization.</p></div>
          <button onClick={showCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"><Plus size={18}/> New contact</button>
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[["Total contacts",initialContacts.length,Users],["With email",emailCount,Mail],["With phone",phoneCount,Phone]].map(([label, n, Icon]) => {
            const I = Icon as typeof Users;
            return <div key={label as string} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><I size={20} className="text-indigo-600"/><p className="mt-4 text-sm text-slate-500">{label as string}</p><p className="mt-1 text-3xl font-bold">{n as number}</p></div>;
          })}
        </div>
        <section id="contacts" className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5"><h2 className="text-lg font-semibold">Contacts directory</h2>
            <div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400"/>
              <input className="rounded-xl border border-slate-200 py-2.5 pl-10 pr-4" placeholder="Search contacts" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
          {message && !mode && <div role="status" className="mx-6 mt-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{message}</div>}
          {error ? <p className="p-6 text-rose-700">{error}</p> : contacts.length === 0 ?
            <div className="p-12 text-center text-slate-500">{query ? 'No contacts match your search.' : 'No contacts yet. Create your first contact.'}</div> :
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-6 py-4">Name</th><th>Email</th><th>Phone</th><th className="pr-6 text-right">Actions</th></tr></thead>
              <tbody>{contacts.map((c,i)=><tr key={c.id ?? i} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold">{c.firstName} {c.lastName ?? ''}</td><td className="pr-4">{c.email || '—'}</td><td className="pr-4">{c.phone || '—'}</td>
                <td className="space-x-2 whitespace-nowrap py-3 pr-6 text-right"><button aria-label={`Edit ${c.firstName}`} onClick={()=>showEdit(c)} className="rounded-lg border px-3 py-2 hover:bg-indigo-50"><Pencil size={16}/></button>
                  <button aria-label={`Delete ${c.firstName}`} disabled={busyId===c.id} onClick={()=>remove(c)} className="rounded-lg border px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}
        </section>
      </main>
      {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setMode(null)}}>
        <section role="dialog" aria-modal="true" aria-label={mode==='edit'?'Edit contact':'Create contact'} className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
          <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">{mode==='edit'?'Edit contact':'New contact'}</h2>
            <button aria-label="Close dialog" onClick={()=>setMode(null)}><X size={20}/></button></div>
          <form onSubmit={submit} className="space-y-4">{field('firstName','First name')}{field('lastName','Last name')}{field('email','Email','email')}{field('phone','Phone')}
            {message && <p role="alert" className="text-sm text-rose-600">{message}</p>}
            <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={()=>setMode(null)} className="rounded-xl border px-5 py-3">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving?'Saving...':'Save contact'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
