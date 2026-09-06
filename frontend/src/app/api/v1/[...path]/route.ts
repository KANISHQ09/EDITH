import { NextRequest, NextResponse } from 'next/server';

const getBackendUrl = () => {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001';
  return url.replace(/\/+$/, '');
};

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const backendBase = getBackendUrl();
  const subpath = path.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${backendBase}/api/v1/${subpath}${search}`;

  const headers = new Headers();
  req.headers.forEach((val, key) => {
    const k = key.toLowerCase();
    if (!['host', 'connection', 'content-length'].includes(k)) {
      headers.set(key, val);
    }
  });

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const resHeaders = new Headers();
    response.headers.forEach((val, key) => {
      resHeaders.set(key, val);
    });

    const resBody = await response.arrayBuffer();
    return new NextResponse(resBody, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy ${req.method} ${targetUrl}:`, err?.message || err);
    return NextResponse.json(
      {
        error: 'BACKEND_GATEWAY_ERROR',
        message: `Could not reach backend service at ${backendBase}. It may be starting up or the BACKEND_URL environment variable is unset.`,
        targetUrl,
        detail: err?.message || String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
