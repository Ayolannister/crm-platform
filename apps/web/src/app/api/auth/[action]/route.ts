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
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (action === "logout") {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE);
    return response;
  }

  if (action !== "login" && action !== "signup") {
    return NextResponse.json(
      { message: "Unknown action" },
      { status: 404 }
    );
  }

  try {
    const payload = await request.json();

    const upstream = await fetch(`${API}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
