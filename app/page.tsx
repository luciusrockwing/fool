import React from 'react';
import ConsoleShell from '@/components/ConsoleShell';
import { episodeStore } from '@/lib/testbed/episode-store';
import { aggregateScoreboard } from '@/lib/testbed/judge';
import { serializeScenarioYaml, STARTER_SCENARIOS } from '@/lib/testbed/scenarios';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const scenarios = STARTER_SCENARIOS.map((s) => ({
    ...s,
    yaml: serializeScenarioYaml(s),
  }));

  const runs = episodeStore.listCompletedRuns(100);
  const scoreboard = aggregateScoreboard(runs);
  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY);

  return (
    <ConsoleShell
      initialScenarios={scenarios}
      initialRuns={runs}
      initialScoreboard={scoreboard}
      geminiAvailable={geminiAvailable}
    />
  );
}
