import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PlatformPanel } from "@/components/admin-panel";

import { Suspense } from "react";

async function PlatformAdminPage() {
  const token=(await cookies()).get("crm_session")?.value;
  if(!token) redirect("/login");
  const api=process.env.CRM_API_URL??"http://127.0.0.1:8080";
  const response=await fetch(`${api}/admin/platform`,{
    headers:{Authorization:`Bearer ${token}`},
    cache:"no-store",signal:AbortSignal.timeout(10000),
  });
  if(response.status===401) redirect("/login");
  if(response.status===403||response.status===404) notFound();
  if(!response.ok) throw new Error("Unable to load platform administration");
  return <PlatformPanel data={await response.json()}/>;
}

export default function Page() {
  return <Suspense fallback={<main className="min-h-screen bg-[#090909] p-12 text-sm text-zinc-400">Loading platform administration…</main>}>
    <PlatformAdminPage/>
  </Suspense>;
}
