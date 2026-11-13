import { NextRequest, NextResponse } from 'next/server';
import { episodeStore } from '@/lib/testbed/episode-store';
import { dispatchMcpTool, MCP_TOOLS } from '@/lib/testbed/mcp-server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Missing Bearer MCP episode token' } },
      { status: 401 }
    );
  }

  const episode = episodeStore.getEpisodeByToken(token);
  if (!episode) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32002, message: 'Invalid or expired MCP episode token' } },
      { status: 401 }
    );
  }

  let body: { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }

  const rpcId = body.id ?? null;

  if (body.method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.parameters,
        })),
      },
    });
  }

  if (body.method === 'tools/call') {
    const toolName = String(body.params?.name ?? '');
    const args = ((body.params?.arguments ?? {}) as Record<string, unknown>);
    const dispatched = dispatchMcpTool(episode, toolName, args, {
      recordTrace: episodeStore.recordTrace.bind(episodeStore),
      recordSinkEvent: episodeStore.recordSinkEvent.bind(episodeStore),
    });

    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        isError: !dispatched.ok,
        content: [{ type: 'text', text: JSON.stringify(dispatched.result) }],
        trace: dispatched.trace,
      },
    });
  }

  return NextResponse.json(
    { jsonrpc: '2.0', id: rpcId, error: { code: -32601, message: `Method not found: ${body.method}` } },
    { status: 404 }
  );
}
