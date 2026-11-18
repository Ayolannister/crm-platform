import { NextRequest, NextResponse } from "next/server";

const API = process.env.CRM_API_URL ?? "http://127.0.0.1:8080";
type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, ctx: Ctx, method: "GET" | "POST" | "PATCH" | "DELETE") {
  const {path} = await ctx.params;
  const joined = path.join("/");
  // Strict allowlist: never proxy arbitrary API paths or URL parameters.
  const allowed = joined === "context" && method === "GET"
    || joined === "organization" && method === "GET"
    || joined === "platform" && method === "GET"
    || joined === "organization/members" && method === "POST"
    || /^organization\/members\/[0-9a-f-]{36}$/i.test(joined) && ["PATCH","DELETE"].includes(method);
  if (!allowed) return NextResponse.json({message:"Not found"},{status:404});
  const origin = request.headers.get("origin");
  if (method !== "GET" && origin && origin !== (process.env.CRM_WEB_ORIGIN ?? request.nextUrl.origin)) {
    return NextResponse.json({message:"Forbidden"},{status:403});
  }
  const token = request.cookies.get("crm_session")?.value;
  if (!token) return NextResponse.json({message:"Please log in"},{status:401});
  try {
    const response = await fetch(`${API}/admin/${joined}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "POST" || method === "PATCH" ? {"Content-Type":"application/json"} : {}),
      },
      ...(method === "POST" || method === "PATCH" ? { body: await request.text() } : {}),
      cache:"no-store",
      signal:AbortSignal.timeout(10000),
    });
    const body = await response.json();
    const out = NextResponse.json(body,{status:response.status});
    if (response.status === 401) out.cookies.delete("crm_session");
    return out;
  } catch {
    return NextResponse.json({message:"Backend unavailable"},{status:502});
  }
}
export function GET(req:NextRequest,ctx:Ctx){return proxy(req,ctx,"GET");}
export function POST(req:NextRequest,ctx:Ctx){return proxy(req,ctx,"POST");}
export function PATCH(req:NextRequest,ctx:Ctx){return proxy(req,ctx,"PATCH");}
export function DELETE(req:NextRequest,ctx:Ctx){return proxy(req,ctx,"DELETE");}
