"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Building2, Crown, Mail, ShieldCheck, Trash2, Users } from "lucide-react";

type Member = { userId: string; email: string; role: "owner" | "admin" | "member"; joinedAt: string };
type OrgPayload = {
  organization: {id:string;name:string;slug:string;createdAt:string};
  role: "owner" | "admin";
  members: Member[];
  totalContacts: number;
};
type PlatformPayload = {
  totals: {organizations:number;users:number;memberships:number};
  organizations: {id:string;name:string;slug:string;createdAt:string}[];
  capped: boolean;
};
type Workspace = {id:string;name:string;role:string};

async function extractError(response:Response) {
  const body: {message?:string|string[]} = await response.json().catch(()=>({}));
  return Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "Request failed";
}

function Layout({title,description,children}:{title:string;description:string;children:React.ReactNode}) {
  return <main className="min-h-screen bg-[#090909] px-5 py-10 text-white sm:px-10">
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-[#b9ff45] hover:underline">
        <ArrowLeft size={17}/> Back to workspace
      </Link>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b9ff45]">Infiniti / Administration</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
      <div className="mt-9 space-y-5">{children}</div>
    </div>
  </main>;
}

export function OrganizationPanel({data,workspaces}:{data:OrgPayload;workspaces:Workspace[]}) {
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"member"|"admin">("member");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  async function call(path:string,method:"POST"|"PATCH"|"DELETE",payload?:unknown) {
    const res=await fetch(path,{method,headers:payload?{"Content-Type":"application/json"}:undefined,
      body:payload?JSON.stringify(payload):undefined});
    if (!res.ok) throw new Error(await extractError(res));
  }

  async function add(event:FormEvent) {
    event.preventDefault();setError("");setNotice("");setBusy(true);
    try {
      await call("/api/admin/organization/members","POST",{email,role});
      setEmail("");setNotice("Member added. They can switch to this workspace after signing in.");router.refresh();
    } catch(e) {setError(e instanceof Error?e.message:"Could not add member");}
    finally {setBusy(false);}
  }

  async function update(userId:string,nextRole:"member"|"admin") {
    setError("");setNotice("");setBusy(true);
    try {await call(`/api/admin/organization/members/${userId}`,"PATCH",{role:nextRole});setNotice("Role updated.");router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Could not update role");}
    finally {setBusy(false);}
  }

  async function remove(member:Member) {
    if (!window.confirm(`Remove ${member.email} from this organization?`)) return;
    setError("");setNotice("");setBusy(true);
    try {await call(`/api/admin/organization/members/${member.userId}`,"DELETE");setNotice("Member removed.");router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Could not remove member");}
    finally {setBusy(false);}
  }

  async function switchOrg(orgId:string) {
    if (orgId===data.organization.id) return;
    setBusy(true);setError("");
    try {
      const res=await fetch("/api/auth/switch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orgId})});
      if (!res.ok) throw new Error(await extractError(res));
      router.replace("/dashboard");router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"Unable to switch organization");}
    finally {setBusy(false);}
  }

  return <Layout title="Organization admin" description="Manage your organization, team memberships and role-based access. Changes are authorized on the API, not in the browser.">
    {error&&<div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-[#b9ff45]/30 bg-[#b9ff45]/10 p-4 text-sm text-[#b9ff45]">{notice}</div>}
    <section className="grid gap-4 sm:grid-cols-3">
      {[{label:"Contacts",value:data.totalContacts,icon:Users},{label:"Team members",value:data.members.length,icon:ShieldCheck},{label:"Your role",value:data.role,icon:Crown}].map(row=>
        <div key={row.label} className="inf-card p-6"><div className="flex items-center justify-between text-sm text-zinc-400">{row.label}<row.icon size={19} className="text-[#b9ff45]"/></div><p className="mt-7 text-3xl font-semibold capitalize">{row.value}</p></div>)}
    </section>
    <section className="inf-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{data.organization.name}</h2><p className="mt-2 text-sm text-zinc-400">Workspace slug: {data.organization.slug}</p></div><Building2 className="text-[#b9ff45]"/></div>
      {workspaces.length>1&&<div className="mt-6"><label htmlFor="switch-workspace" className="mb-2 block text-sm text-zinc-400">Switch workspace</label>
        <select id="switch-workspace" disabled={busy} value={data.organization.id} onChange={e=>void switchOrg(e.target.value)} className="inf-input max-w-sm">
          {workspaces.map(w=><option value={w.id} key={w.id}>{w.name} ({w.role})</option>)}
        </select><p className="mt-2 text-xs text-zinc-500">Switching refreshes your short-lived session for the selected organization.</p></div>}
    </section>
    <section className="inf-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-6">
        <div><h2 className="text-xl font-semibold">Team members</h2><p className="mt-2 text-sm text-zinc-500">Owners manage access; admins can add members.</p></div>
        <span className="rounded-full bg-[#b9ff45]/10 px-3 py-1 text-xs font-semibold text-[#b9ff45]">{data.members.length} members</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-125 text-left text-sm"><thead className="bg-white/4 text-xs text-zinc-500"><tr><th className="px-6 py-4">User</th><th className="py-4">Role</th><th className="py-4 pr-6 text-right">Actions</th></tr></thead>
        <tbody>{data.members.map(m=><tr key={m.userId} className="border-t border-white/8">
          <td className="px-6 py-4 text-zinc-200"><span className="flex items-center gap-2"><Mail size={15} className="text-zinc-500"/>{m.email}</span></td>
          <td className="py-4"><span className="rounded-full bg-white/7 px-3 py-1 text-xs capitalize text-zinc-200">{m.role}</span></td>
          <td className="space-x-2 whitespace-nowrap py-4 pr-6 text-right">
            {data.role==="owner"&&m.role!=="owner"&&<><select aria-label={`Role for ${m.email}`} disabled={busy} value={m.role} onChange={e=>void update(m.userId,e.target.value as "member"|"admin")}
              className="rounded-lg border border-white/15 bg-[#252525] px-2 py-2 text-xs"><option value="member">Member</option><option value="admin">Admin</option></select>
              <button aria-label={`Remove ${m.email}`} onClick={()=>void remove(m)} disabled={busy} className="inline-flex rounded-lg border border-red-400/20 p-2 text-red-300 disabled:opacity-40"><Trash2 size={16}/></button></>}
            {m.role==="owner"&&<span className="text-xs text-zinc-500">Protected</span>}
          </td>
        </tr>)}</tbody></table></div>
    </section>
    <section className="inf-card p-6 sm:p-8"><h2 className="text-xl font-semibold">Add existing Infiniti user</h2>
      <p className="mt-2 text-sm text-zinc-500">For this MVP, a teammate must register their own Infiniti account first. This adds their existing account to your organization; invitation emails are not sent.</p>
      <form onSubmit={add} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input type="email" required placeholder="colleague@example.com" aria-label="Teammate email" className="inf-input flex-1" value={email} onChange={e=>setEmail(e.target.value)}/>
        <select aria-label="New member role" disabled={data.role!=="owner"} className="inf-input sm:w-36" value={role} onChange={e=>setRole(e.target.value as "member"|"admin")}><option value="member">Member</option>{data.role==="owner"&&<option value="admin">Admin</option>}</select>
        <button type="submit" disabled={busy} className="inf-btn disabled:opacity-40">Add member</button>
      </form>
    </section>
  </Layout>;
}

export function PlatformPanel({data}:{data:PlatformPayload}) {
  return <Layout title="Platform administration" description="A protected, read-only overview of Infiniti organizations and platform adoption. Customer contacts remain tenant-isolated.">
    <div className="grid gap-4 sm:grid-cols-3">
      {[{label:"Organizations",value:data.totals.organizations,icon:Building2},{label:"Registered users",value:data.totals.users,icon:Users},{label:"Memberships",value:data.totals.memberships,icon:ArrowRightLeft}].map(s=>
        <div className="inf-card p-6" key={s.label}><div className="flex items-center justify-between text-sm text-zinc-400">{s.label}<s.icon className="text-[#b9ff45]" size={19}/></div>
        <p className="mt-7 text-4xl font-semibold">{s.value.toLocaleString()}</p></div>)}
    </div>
    <section className="inf-card overflow-hidden">
      <div className="border-b border-white/8 p-6"><h2 className="text-xl font-semibold">Registered organizations</h2>
        <p className="mt-2 text-sm text-zinc-500">Most recently registered; no cross-tenant contact details are exposed.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-120 text-left text-sm">
        <thead className="bg-white/4 text-xs text-zinc-400"><tr><th className="px-6 py-4">Organization</th><th>Slug</th><th>Registered</th></tr></thead>
        <tbody>{data.organizations.map(o=><tr key={o.id} className="border-t border-white/7"><td className="px-6 py-4 font-semibold">{o.name}</td><td className="text-zinc-400">{o.slug}</td><td className="text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
      </table></div>
      {data.capped&&<p className="p-5 text-xs text-zinc-400">Showing the newest 100 organizations.</p>}
    </section>
    <section className="rounded-2xl border border-[#b9ff45]/20 bg-[#b9ff45]/8 p-6 text-sm text-zinc-300">
      <p className="font-semibold text-[#b9ff45]">Platform safeguards</p>
      <p className="mt-2 leading-7">Super admin access is granted only through a database-controlled allowlist. Organization membership permissions are checked separately. Suspension, billing, cross-tenant contact access, and audit logging are intentionally not enabled in this MVP.</p>
    </section>
  </Layout>;
}
