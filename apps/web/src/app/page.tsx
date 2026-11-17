import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Users, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909] px-6 py-8 text-white md:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-2xl font-bold tracking-tight">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45] text-2xl font-black text-black">∞</span>
          infiniti<span className="-ml-3 text-[#b9ff45]">.</span>
        </Link>
        <Link href="/login" className="inf-btn-secondary">Sign in <ArrowUpRight size={16}/></Link>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-14 pb-22 pt-24 lg:grid-cols-[1fr_1fr] lg:pt-34">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b9ff45]/25 bg-[#b9ff45]/8 px-4 py-2 text-xs font-medium text-[#b9ff45]">Built for meaningful connections</div>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tighter sm:text-6xl xl:text-7xl">Your network.<br/><span className="text-[#b9ff45]">Infinite potential.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-zinc-400">A beautifully simple way to manage contacts, understand your relationships, and grow with clarity.</p>
          <div className="mt-10 flex flex-wrap gap-3"><Link href="/signup" className="inf-btn">Get started <ArrowRight size={18}/></Link><Link href="/login" className="inf-btn-secondary">Open workspace</Link></div>
          <p className="mt-8 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck size={15} className="text-[#b9ff45]"/> Private, organization-isolated contact management</p>
        </div>
        <div className="inf-card overflow-hidden p-6 sm:p-8">
          <div className="flex items-center justify-between"><p className="text-xs text-zinc-500">Workspace overview</p><span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-zinc-400"><span className="h-2 w-2 rounded-full bg-[#b9ff45]"/> Infiniti</span></div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#202020] p-5"><Users size={20} className="text-[#b9ff45]"/><p className="mt-8 text-xl font-semibold">Contacts</p><p className="mt-2 text-xs text-zinc-500">Organize your network</p></div>
            <div className="rounded-2xl bg-[#b9ff45] p-5 text-[#131b0d]"><BarChart3 size={20}/><p className="mt-8 text-xl font-semibold">Insights</p><p className="mt-2 text-xs text-[#131b0d]/65">Understand your data</p></div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#202020] p-6"><div className="flex items-center justify-between"><span className="text-sm text-zinc-300">Your relationships, organized</span><ArrowUpRight size={17} className="text-[#b9ff45]"/></div><div className="mt-6 grid grid-cols-8 items-end gap-2">{[30,57,70,48,92,68,83,100].map((height,i)=><div key={i} className={i%3===0?"rounded-t bg-[#9583b8]":"rounded-t bg-[#b9ff45]"} style={{height:`${height}px`}} />)}</div><p className="mt-4 text-[11px] text-zinc-600">Illustrative design preview — your dashboard uses real CRM data.</p></div>
        </div>
      </section>
    </main>
  );
}
