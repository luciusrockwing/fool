import { NextRequest, NextResponse } from 'next/server';
import type { PersonaType } from '@/lib/ledger/types';
import { applyScenarioPayloads, getScenarioById } from '@/lib/testbed/scenarios';
import { generateWorld } from '@/lib/testbed/world-generator';

const VALID_PERSONAS = new Set<PersonaType>(['freelancer', 'family', 'executive', 'student']);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const seedRaw = Number(params.get('seed') ?? '42');
  const seed = Number.isFinite(seedRaw) ? Math.trunc(seedRaw) : 42;
  const personaParam = (params.get('persona') ?? 'freelancer') as PersonaType;
  const persona: PersonaType = VALID_PERSONAS.has(personaParam) ? personaParam : 'freelancer';
  const monthsRaw = Number(params.get('months') ?? '6');
  const months = Number.isFinite(monthsRaw) ? Math.max(1, Math.min(12, Math.trunc(monthsRaw))) : 6;
  const scenarioId = params.get('scenarioId');

  let world = generateWorld({ seed, persona, months });
  let activeScenario = null;

  if (scenarioId) {
    const scenario = getScenarioById(scenarioId);
    if (scenario) {
      activeScenario = scenario;
      world = applyScenarioPayloads(world, scenario);
    }
  }

  return NextResponse.json({
    world,
    appliedScenarioId: activeScenario?.id ?? null,
  });
}
