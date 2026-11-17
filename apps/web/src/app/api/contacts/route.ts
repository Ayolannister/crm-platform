import { NextRequest, NextResponse } from "next/server";


const API = process.env.CRM_API_URL ?? "http://127.0.0.1:8080";

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const origin = request.headers.get("origin");

  if (method === "POST" && origin && origin !== (process.env.CRM_WEB_ORIGIN ?? request.nextUrl.origin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const token = request.cookies.get("crm_session")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Please log in" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${API}/contacts`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "POST"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(method === "POST"
        ? { body: await request.text() }
        : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();

    const result = NextResponse.json(data, {
      status: response.status,
    });

    if (response.status === 401) {
      result.cookies.delete("crm_session");
    }

    return result;
  } catch {
    return NextResponse.json(
      { message: "CRM backend unavailable" },
      { status: 502 }
    );
  }
}

export function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export function POST(request: NextRequest) {
  return proxy(request, "POST");
}
