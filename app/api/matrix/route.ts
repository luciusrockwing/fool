import { NextRequest, NextResponse } from 'next/server';
import { executeEpisodeRun } from '@/lib/testbed/agents';
import { episodeStore } from '@/lib/testbed/episode-store';
import { aggregateScoreboard } from '@/lib/testbed/judge';
import { STARTER_SCENARIOS } from '@/lib/testbed/scenarios';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      executionMode?: 'deterministic' | 'gemini-live';
      includePipelock?: boolean;
      includeReadOnly?: boolean;
      scenarioIds?: string[];
    };

    const executionMode = body.executionMode ?? 'deterministic';
    const scenarios = body.scenarioIds?.length
      ? STARTER_SCENARIOS.filter((s) => body.scenarioIds!.includes(s.id))
      : STARTER_SCENARIOS;

    const configs: Array<{
      agentProfile: 'naive' | 'hardened';
      pipelockProxy: boolean;
      readOnlyScope: boolean;
      hardenedPrompt: boolean;
    }> = [
      { agentProfile: 'naive', pipelockProxy: false, readOnlyScope: false, hardenedPrompt: false },
      { agentProfile: 'hardened', pipelockProxy: false, readOnlyScope: false, hardenedPrompt: true },
    ];

    if (body.includePipelock ?? true) {
      configs.push({
        agentProfile: 'naive',
        pipelockProxy: true,
        readOnlyScope: false,
        hardenedPrompt: false,
      });
    }

    if (body.includeReadOnly) {
      configs.push({
        agentProfile: 'naive',
        pipelockProxy: false,
        readOnlyScope: true,
        hardenedPrompt: false,
      });
    }

    const matrixResults = [];
    for (const scenario of scenarios) {
      for (const cfg of configs) {
        const ep = await executeEpisodeRun({
          scenario,
          agentProfile: cfg.agentProfile,
          executionMode,
          defenses: {
            pipelockProxy: cfg.pipelockProxy,
            readOnlyScope: cfg.readOnlyScope,
            hardenedPrompt: cfg.hardenedPrompt,
          },
        });
        matrixResults.push({
          id: ep.id,
          scenarioId: ep.scenarioId,
          difficulty: ep.difficulty,
          vector: ep.vector,
          agentProfile: ep.agentProfile,
          defenses: ep.defenses,
          judgeReport: ep.judgeReport,
        });
      }
    }

    const allRuns = episodeStore.listCompletedRuns(150);
    return NextResponse.json({
      executedCount: matrixResults.length,
      matrixResults,
      runs: allRuns,
      scoreboard: aggregateScoreboard(allRuns),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Matrix benchmark failed' },
      { status: 500 }
    );
  }
}
