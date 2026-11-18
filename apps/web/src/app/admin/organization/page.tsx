import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OrganizationPanel } from "@/components/admin-panel";

import { Suspense } from "react";

async function OrganizationAdminPage() {
  const token=(await cookies()).get("crm_session")?.value;
  if(!token) redirect("/login");
  const api=process.env.CRM_API_URL??"http://127.0.0.1:8080";
  const headers={Authorization:`Bearer ${token}`};
  const [org,workspaces]=await Promise.all([
    fetch(`${api}/admin/organization`,{headers,cache:"no-store",signal:AbortSignal.timeout(10000)}),
    fetch(`${api}/auth/organizations`,{headers,cache:"no-store",signal:AbortSignal.timeout(10000)}),
  ]);
  if(org.status===401) redirect("/login");
  if(org.status===403||org.status===404) notFound();
  if(!org.ok) throw new Error("Unable to load organization administration");
  const data=await org.json();
  return <OrganizationPanel data={data} workspaces={workspaces.ok?await workspaces.json():[]}/>;
}

export default function Page() {
  return <Suspense fallback={<main className="min-h-screen bg-[#090909] p-12 text-sm text-zinc-400">Loading organization administration…</main>}>
    <OrganizationAdminPage/>
  </Suspense>;
}
