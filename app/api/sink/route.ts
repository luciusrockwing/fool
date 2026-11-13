import { NextRequest, NextResponse } from 'next/server';
import { episodeStore } from '@/lib/testbed/episode-store';

export async function POST(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get('episodeId') ?? undefined;
  let rawBody = '';
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      rawBody = JSON.stringify(await req.json());
    } else {
      rawBody = await req.text();
    }
  } catch {
    rawBody = '';
  }

  const event = episodeStore.recordSinkEvent({
    episodeId,
    method: 'POST',
    destination: req.nextUrl.pathname,
    payload: rawBody,
  });

  return NextResponse.json({
    captured: true,
    loopbackOnly: true,
    event,
  });
}

export async function GET(req: NextRequest) {
  const episodeId = req.nextUrl.searchParams.get('episodeId') ?? undefined;
  const payload = req.nextUrl.searchParams.toString();
  const event = episodeStore.recordSinkEvent({
    episodeId,
    method: 'GET',
    destination: req.nextUrl.pathname,
    payload,
  });

  return NextResponse.json({
    captured: true,
    loopbackOnly: true,
    event,
  });
}
