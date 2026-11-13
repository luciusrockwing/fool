#!/usr/bin/env tsx
import { executeEpisodeRun } from '../lib/testbed/agents';
import { episodeStore } from '../lib/testbed/episode-store';
import { aggregateScoreboard } from '../lib/testbed/judge';
import { getScenarioById, STARTER_SCENARIOS } from '../lib/testbed/scenarios';

interface CliArgs {
  scenario?: string;
  agent: 'naive' | 'hardened';
  pipelock: boolean;
  readonly: boolean;
  pack: boolean;
  matrix: boolean;
  live: boolean;
  format: 'text' | 'json';
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    agent: 'naive',
    pipelock: false,
    readonly: false,
    pack: false,
    matrix: false,
    live: false,
    format: 'text',
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--scenario' && argv[i + 1]) {
      args.scenario = argv[++i];
    } else if (token === '--agent' && argv[i + 1]) {
      args.agent = argv[++i] === 'hardened' ? 'hardened' : 'naive';
    } else if (token === '--pipelock') {
      args.pipelock = true;
    } else if (token === '--readonly') {
      args.readonly = true;
    } else if (token === '--pack') {
      args.pack = true;
    } else if (token === '--matrix') {
      args.matrix = true;
    } else if (token === '--live') {
      args.live = true;
    } else if (token === '--format' && argv[i + 1]) {
      args.format = argv[++i] === 'json' ? 'json' : 'text';
    }
  }
  return args;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const executionMode = cli.live ? 'gemini-live' : 'deterministic';

  if (cli.matrix) {
    const configs = [
      { agentProfile: 'naive' as const, pipelockProxy: false, readOnlyScope: false, hardenedPrompt: false },
      { agentProfile: 'hardened' as const, pipelockProxy: false, readOnlyScope: false, hardenedPrompt: true },
      { agentProfile: 'naive' as const, pipelockProxy: true, readOnlyScope: false, hardenedPrompt: false },
      { agentProfile: 'naive' as const, pipelockProxy: false, readOnlyScope: true, hardenedPrompt: false },
    ];
    const runs = [];
    for (const scenario of STARTER_SCENARIOS) {
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
        runs.push(ep);
      }
    }
    const scoreboard = aggregateScoreboard(episodeStore.listCompletedRuns(150));
    if (cli.format === 'json') {
      console.log(JSON.stringify({ scoreboard, totalExecuted: runs.length }, null, 2));
    } else {
      console.log(`\nFoolsgold Matrix Benchmark (${runs.length} episodes)\n`);
      for (const row of scoreboard.byProfile) {
        console.log(
          `  ${row.label.padEnd(22)} | ASR: ${String(row.asrPercent).padStart(3)}% | Utility: ${String(row.avgUtility).padStart(3)}% | Avg TTC: ${row.avgTtc ?? '-'}`
        );
      }
    }
    return;
  }

  const scenarios = cli.pack
    ? STARTER_SCENARIOS
    : [getScenarioById(cli.scenario ?? 'merchant-descriptor-injection-01')].filter(
        (s): s is NonNullable<typeof s> => Boolean(s)
      );

  if (scenarios.length === 0) {
    console.error(`Unknown scenario: ${cli.scenario}`);
    process.exit(1);
  }

  const results = [];
  for (const scenario of scenarios) {
    const ep = await executeEpisodeRun({
      scenario,
      agentProfile: cli.agent,
      executionMode,
      defenses: {
        pipelockProxy: cli.pipelock,
        readOnlyScope: cli.readonly,
        hardenedPrompt: cli.agent === 'hardened',
      },
    });
    results.push(ep);
  }

  if (cli.format === 'json') {
    console.log(
      JSON.stringify(
        results.map((ep) => ({
          id: ep.id,
          scenarioId: ep.scenarioId,
          agentProfile: ep.agentProfile,
          defenses: ep.defenses,
          judgeReport: ep.judgeReport,
          sinkEvents: ep.sinkEvents,
          traces: ep.traces,
        })),
        null,
        2
      )
    );
    return;
  }

  for (const ep of results) {
    const verdict = ep.judgeReport?.attackSuccess ? 'COMPROMISED' : 'DEFENDED';
    console.log(`\n[${verdict}] ${ep.scenarioId} (${ep.agentProfile})`);
    console.log(`  Summary: ${ep.judgeReport?.summary}`);
    console.log(
      `  Utility: ${ep.judgeReport?.taskUtility}% | TTC: ${ep.judgeReport?.timeToCompromise ?? 'N/A'} | Sink Hits: ${ep.sinkEvents.length}`
    );
    for (const tr of ep.traces) {
      console.log(
        `    Step ${tr.step}: ${tr.tool}(${JSON.stringify(tr.args)}) -> ${tr.blockedBy === 'none' ? 'OK' : `BLOCKED[${tr.blockedBy}]`}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
