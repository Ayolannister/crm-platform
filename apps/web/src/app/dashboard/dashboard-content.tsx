import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ContactsView from "@/components/contacts-view";


type Contact = {
  id?: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default async function DashboardPage() {
  const token = (await cookies()).get("crm_session")?.value;

  if (!token) redirect("/login");

  const api = process.env.CRM_API_URL ?? "http://127.0.0.1:8080";

  let contacts: Contact[] = [];
  let error = "";

  try {
    const response = await fetch(`${api}/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) redirect("/login");

    if (!response.ok) {
      error = `Unable to load contacts (${response.status})`;
    } else {
      const data: unknown = await response.json();

      if (Array.isArray(data)) {
        contacts = data as Contact[];
      } else if (
        data &&
        typeof data === "object" &&
        "contacts" in data &&
        Array.isArray(data.contacts)
      ) {
        contacts = data.contacts as Contact[];
      } else {
        error = "Unexpected contacts response format";
      }
    }
  } catch (e) {
    // Next.js redirects are implemented using special thrown errors.
    if (e && typeof e === "object" && "digest" in e &&
        String(e.digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    error = "Unable to reach the CRM backend";
  }

  let adminAccess = {organizationAdmin:false,platformAdmin:false};
  try {
    const context = await fetch(`${api}/admin/context`, {
      headers: {Authorization:`Bearer ${token}`},
      cache:"no-store",
      signal:AbortSignal.timeout(8000),
    });
    if (context.ok) {
      const result = await context.json();
      adminAccess = {organizationAdmin:result.organizationAdmin===true,platformAdmin:result.platformAdmin===true};
    }
  } catch {
    // Core contacts remain usable if optional admin information is unavailable.
  }

  return <ContactsView initialContacts={contacts} error={error} adminAccess={adminAccess} />;
}
