import { NextRequest, NextResponse } from 'next/server';
import {
  parseScenarioYaml,
  serializeScenarioYaml,
  STARTER_SCENARIOS,
} from '@/lib/testbed/scenarios';

export async function GET() {
  return NextResponse.json({
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
    scenarios: STARTER_SCENARIOS.map((s) => ({
      ...s,
      yaml: serializeScenarioYaml(s),
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { yaml?: string };
    if (!body.yaml) {
      return NextResponse.json({ error: 'Missing yaml field' }, { status: 400 });
    }
    const scenario = parseScenarioYaml(body.yaml);
    return NextResponse.json({
      scenario,
      yaml: serializeScenarioYaml(scenario),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid scenario YAML' },
      { status: 400 }
    );
  }
}
