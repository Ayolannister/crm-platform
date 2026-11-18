import { NextRequest, NextResponse } from "next/server";


const API = process.env.CRM_API_URL ?? "http://127.0.0.1:8080";
const COOKIE = "crm_session";

type Context = {
  params: Promise<{ action: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;

  // Prevent cross-origin form submissions.
  const origin = request.headers.get("origin");
  if (origin && origin !== (process.env.CRM_WEB_ORIGIN ?? request.nextUrl.origin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (action === "logout") {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE);
    return response;
  }

  if (action !== "login" && action !== "signup" && action !== "switch") {
    return NextResponse.json(
      { message: "Unknown action" },
      { status: 404 }
    );
  }

  try {
    const payload = await request.json();

    const sessionToken = request.cookies.get(COOKIE)?.value;
    if (action === "switch" && !sessionToken) {
      return NextResponse.json({ message: "Please log in" }, { status: 401 });
    }

    const upstream = await fetch(`${API}/auth/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(action === "switch" ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    if (!data.accessToken || data.tokenType !== "Bearer") {
      return NextResponse.json(
        { message: "Unexpected authentication response" },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(Number(data.expiresIn) || 900, 900),
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the CRM backend" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: Context) {
  const {action} = await context.params;
  if (action !== "organizations") return NextResponse.json({message:"Not found"},{status:404});
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({message:"Please log in"},{status:401});
  try {
    const upstream = await fetch(`${API}/auth/organizations`,{
      headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)
    });
    return NextResponse.json(await upstream.json(),{status:upstream.status});
  } catch {
    return NextResponse.json({message:"Backend unavailable"},{status:502});
  }
}
