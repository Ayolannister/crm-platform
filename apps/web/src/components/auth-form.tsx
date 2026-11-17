"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = signup
      ? { orgName: form.get("orgName"), orgSlug: form.get("orgSlug"), email: form.get("email"), password: form.get("password") }
      : { email: form.get("email"), password: form.get("password") };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.message;
        setError(Array.isArray(message) ? message.join(", ") : message || "Authentication failed");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch { setError("Unable to connect to the server"); }
    finally { setLoading(false); }
  }

  return (
    <main className="grid min-h-screen bg-[#090909] text-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-white/10 bg-[#141414] px-12 py-12 lg:flex lg:flex-col xl:px-20">
        <Link href="/" className="flex items-center gap-3 text-2xl font-bold tracking-tight"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b9ff45] text-2xl font-black text-[#111]">∞</span>infiniti<span className="-ml-3 text-[#b9ff45]">.</span></Link>
        <div className="relative z-10 my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b9ff45]/25 bg-[#b9ff45]/8 px-4 py-2 text-xs font-medium text-[#b9ff45]"><Sparkles size={14}/> The smarter way to manage relationships</span>
          <h1 className="mt-9 text-5xl font-semibold leading-[1.1] tracking-tight xl:text-6xl">Every connection.<br/><span className="text-[#b9ff45]">Infinite potential.</span></h1>
          <p className="mt-7 max-w-md text-base leading-8 text-zinc-400">All your contacts, a clearer picture of your network, and one beautifully simple workspace.</p>
          <div className="mt-12 grid max-w-md grid-cols-2 gap-4">
            <div className="inf-card p-5"><div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9ff45]/10 text-[#b9ff45]"><ShieldCheck size={22}/></div><p className="text-lg font-semibold">Private by design</p><p className="mt-2 text-xs leading-6 text-zinc-500">Organization-isolated contacts</p></div>
            <div className="inf-card p-5"><div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9ff45]/10 text-[#b9ff45]"><Check size={22}/></div><p className="text-lg font-semibold">Built to connect</p><p className="mt-2 text-xs leading-6 text-zinc-500">One place for every relationship</p></div>
          </div>
        </div>
        <p className="relative z-10 text-xs text-zinc-600">INFINITI · Relationship management, reimagined.</p>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-50 -left-30 h-130 w-130 rounded-full border-[90px] border-[#b9ff45]/4" />
      </section>
      <section className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-12 flex items-center gap-2 text-2xl font-bold lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b9ff45] text-xl text-[#111]">∞</span> infiniti<span className="-ml-2 text-[#b9ff45]">.</span></Link>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#b9ff45]">{signup ? "Join Infiniti" : "Welcome back"}</p>
          <h2 className="text-4xl font-semibold tracking-tight">{signup ? "Create your workspace" : "Sign in to Infiniti"}</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-500">{signup ? "Start building stronger connections with a workspace of your own." : "Your contacts and insights are right where you left them."}</p>
          <form onSubmit={submit} className="mt-10 space-y-5">
            {signup && <>
              <label className="block text-xs font-medium text-zinc-400">Organization name<input name="orgName" required minLength={2} maxLength={100} className="inf-input mt-2" placeholder="Acme Limited"/></label>
              <label className="block text-xs font-medium text-zinc-400">Organization slug<input name="orgSlug" required minLength={3} maxLength={40} pattern="[a-z0-9-]+" className="inf-input mt-2" placeholder="acme-limited"/></label>
            </>}
            <label className="block text-xs font-medium text-zinc-400">Email address<input name="email" type="email" required autoComplete="email" className="inf-input mt-2" placeholder="you@company.com"/></label>
            <label className="block text-xs font-medium text-zinc-400">Password<input name="password" type="password" required autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 12 : undefined} className="inf-input mt-2" placeholder="Enter your password"/></label>
            {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">{error}</p>}
            <button disabled={loading} className="inf-btn mt-3 w-full justify-center py-4 disabled:opacity-50">{loading ? "Please wait..." : signup ? "Create workspace" : "Sign in"} <ArrowRight size={18}/></button>
          </form>
          <p className="mt-8 text-center text-sm text-zinc-500">{signup ? "Already have an account?" : "New to Infiniti?"}{" "}
            <Link href={signup ? "/login" : "/signup"} className="font-semibold text-[#b9ff45] hover:underline">{signup ? "Sign in" : "Create an account"}</Link>
          </p>
          <p className="mt-16 text-center text-xs text-zinc-600">© Infiniti · Made for meaningful connections</p>
        </div>
      </section>
    </main>
  );
}
