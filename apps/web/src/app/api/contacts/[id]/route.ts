import { NextRequest, NextResponse } from 'next/server';

const API = process.env.CRM_API_URL ?? 'http://127.0.0.1:8080';
type Context = { params: Promise<{ id: string }> };

async function forward(request: NextRequest, ctx: Context, method: 'PATCH' | 'DELETE') {
  const origin = request.headers.get('origin');
  if (origin && origin !== (process.env.CRM_WEB_ORIGIN ?? request.nextUrl.origin)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const token = request.cookies.get('crm_session')?.value;
  if (!token) return NextResponse.json({ message: 'Please log in' }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ message: 'Invalid contact ID' }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${API}/contacts/${id}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'PATCH' ? { body: await request.text() } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json();
    const response = NextResponse.json(data, { status: upstream.status });
    if (upstream.status === 401) response.cookies.delete('crm_session');
    return response;
  } catch {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
  }
}

export function PATCH(request: NextRequest, ctx: Context) {
  return forward(request, ctx, 'PATCH');
}
export function DELETE(request: NextRequest, ctx: Context) {
  return forward(request, ctx, 'DELETE');
}
