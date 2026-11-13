import { NextRequest, NextResponse } from 'next/server';
import { computeLedgerDiff } from '@/lib/ledger/engine';
import { executeEpisodeRun } from '@/lib/testbed/agents';
import { episodeStore, type DefenseConfig, type EpisodeRecord } from '@/lib/testbed/episode-store';
import { aggregateScoreboard } from '@/lib/testbed/judge';
import { getScenarioById, parseScenarioYaml, type ScenarioDefinition } from '@/lib/testbed/scenarios';

function serializeEpisodeResult(ep: EpisodeRecord) {
  return {
    id: ep.id,
    token: ep.token,
    scenarioId: ep.scenarioId,
    scenarioTitle: ep.scenarioTitle,
    difficulty: ep.difficulty,
    vector: ep.vector,
    task: ep.task,
    agentProfile: ep.agentProfile,
    executionMode: ep.executionMode,
    modelName: ep.modelName,
    defenses: ep.defenses,
    seed: ep.seed,
    canaries: ep.baselineWorld.canaries,
    traces: ep.traces,
    sinkEvents: ep.sinkEvents,
    ledgerDiff: computeLedgerDiff(ep.baselineWorld, ep.workingWorld),
    agentFinalResponse: ep.agentFinalResponse,
    judgeReport: ep.judgeReport,
    createdAt: ep.createdAt,
    completedAt: ep.completedAt,
  };
}

export async function GET() {
  const runs = episodeStore.listCompletedRuns(100);
  const scoreboard = aggregateScoreboard(runs);
  return NextResponse.json({
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
    runs,
    scoreboard,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: 'run' | 'compare';
      scenarioId?: string;
      customYaml?: string;
      agentProfile?: 'naive' | 'hardened';
      executionMode?: 'deterministic' | 'gemini-live';
      defenses?: Partial<DefenseConfig>;
      seedOverride?: number;
      useLlmJudge?: boolean;
    };

    let scenario: ScenarioDefinition | undefined;
    if (body.customYaml) {
      scenario = parseScenarioYaml(body.customYaml);
    } else if (body.scenarioId) {
      scenario = getScenarioById(body.scenarioId);
    }

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const executionMode = body.executionMode ?? 'deterministic';

    if (body.action === 'compare') {
      const naiveRun = await executeEpisodeRun({
        scenario,
        agentProfile: 'naive',
        executionMode,
        defenses: {
          pipelockProxy: Boolean(body.defenses?.pipelockProxy),
          readOnlyScope: Boolean(body.defenses?.readOnlyScope),
          hardenedPrompt: false,
        },
        seedOverride: body.seedOverride,
        useLlmJudge: body.useLlmJudge,
      });

      const hardenedRun = await executeEpisodeRun({
        scenario,
        agentProfile: 'hardened',
        executionMode,
        defenses: {
          pipelockProxy: Boolean(body.defenses?.pipelockProxy),
          readOnlyScope: Boolean(body.defenses?.readOnlyScope),
          hardenedPrompt: true,
        },
        seedOverride: body.seedOverride,
        useLlmJudge: body.useLlmJudge,
      });

      return NextResponse.json({
        mode: 'compare',
        naive: serializeEpisodeResult(naiveRun),
        hardened: serializeEpisodeResult(hardenedRun),
        scoreboard: aggregateScoreboard(episodeStore.listCompletedRuns(100)),
      });
    }

    const agentProfile = body.agentProfile ?? 'naive';
    const ep = await executeEpisodeRun({
      scenario,
      agentProfile,
      executionMode,
      defenses: body.defenses,
      seedOverride: body.seedOverride,
      useLlmJudge: body.useLlmJudge,
    });

    return NextResponse.json({
      mode: 'single',
      episode: serializeEpisodeResult(ep),
      scoreboard: aggregateScoreboard(episodeStore.listCompletedRuns(100)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Episode execution failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  episodeStore.clearCompletedRuns();
  return NextResponse.json({
    cleared: true,
    runs: [],
    scoreboard: aggregateScoreboard([]),
  });
}
