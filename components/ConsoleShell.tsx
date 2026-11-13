'use client';

import React, { useState } from 'react';
import type { DefenseConfig, PersistedRunSummary } from '@/lib/testbed/episode-store';
import type { ScoreboardMetrics } from '@/lib/testbed/judge';
import type {
  ComparePayload,
  ScenarioWithYaml,
  SerializedEpisode,
  SinglePayload,
} from '@/lib/testbed/ui-types';
import EpisodeConsoleView from './EpisodeConsoleView';
import LedgerInspectorView from './LedgerInspectorView';
import ScenarioBrowserView from './ScenarioBrowserView';
import ScoreboardView from './ScoreboardView';

type ActiveView = 'console' | 'scenarios' | 'ledger' | 'scoreboard';

interface ConsoleShellProps {
  initialScenarios: ScenarioWithYaml[];
  initialRuns: PersistedRunSummary[];
  initialScoreboard: ScoreboardMetrics;
  geminiAvailable: boolean;
}

export default function ConsoleShell({
  initialScenarios,
  initialRuns,
  initialScoreboard,
  geminiAvailable,
}: ConsoleShellProps) {
  const [activeView, setActiveView] = useState<ActiveView>('console');
  const [scenarios] = useState<ScenarioWithYaml[]>(initialScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    initialScenarios[0]?.id ?? 'merchant-descriptor-injection-01'
  );
  const [runs, setRuns] = useState<PersistedRunSummary[]>(initialRuns);
  const [scoreboard, setScoreboard] = useState<ScoreboardMetrics>(initialScoreboard);

  const [activeCompare, setActiveCompare] = useState<{
    naive: SerializedEpisode;
    hardened: SerializedEpisode;
  } | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<SerializedEpisode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningMatrix, setIsRunningMatrix] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshRuns = async () => {
    const res = await fetch('/api/episodes');
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs);
      setScoreboard(data.scoreboard);
    }
  };

  const handleRunSingle = async (opts: {
    scenarioId: string;
    agentProfile: 'naive' | 'hardened';
    executionMode: 'deterministic' | 'gemini-live';
    defenses: DefenseConfig;
    seedOverride?: number;
  }) => {
    setIsRunning(true);
    setErrorMessage(null);
    setActiveCompare(null);
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          scenarioId: opts.scenarioId,
          agentProfile: opts.agentProfile,
          executionMode: opts.executionMode,
          defenses: opts.defenses,
          seedOverride: opts.seedOverride,
          useLlmJudge: opts.executionMode === 'gemini-live',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Episode run failed');
      }
      const payload = data as SinglePayload;
      setActiveEpisode(payload.episode);
      setScoreboard(payload.scoreboard);
      await refreshRuns();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Episode run failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCompare = async (opts: {
    scenarioId: string;
    executionMode: 'deterministic' | 'gemini-live';
    defenses: DefenseConfig;
    seedOverride?: number;
  }) => {
    setIsRunning(true);
    setErrorMessage(null);
    setActiveEpisode(null);
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare',
          scenarioId: opts.scenarioId,
          executionMode: opts.executionMode,
          defenses: opts.defenses,
          seedOverride: opts.seedOverride,
          useLlmJudge: opts.executionMode === 'gemini-live',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Comparison failed');
      }
      const payload = data as ComparePayload;
      setActiveCompare({ naive: payload.naive, hardened: payload.hardened });
      setScoreboard(payload.scoreboard);
      await refreshRuns();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCustomYaml = async (yamlText: string) => {
    setIsRunning(true);
    setErrorMessage(null);
    setActiveEpisode(null);
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare',
          customYaml: yamlText,
          executionMode: 'deterministic',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Custom YAML run failed');
      }
      const payload = data as ComparePayload;
      setActiveCompare({ naive: payload.naive, hardened: payload.hardened });
      setScoreboard(payload.scoreboard);
      setActiveView('console');
      await refreshRuns();
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunMatrix = async () => {
    setIsRunningMatrix(true);
    setErrorMessage(null);
    setActiveView('scoreboard');
    try {
      const res = await fetch('/api/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionMode: 'deterministic',
          includePipelock: true,
          includeReadOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Matrix run failed');
      }
      setRuns(data.runs);
      setScoreboard(data.scoreboard);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Matrix run failed');
    } finally {
      setIsRunningMatrix(false);
    }
  };

  const handleClearRuns = async () => {
    const res = await fetch('/api/episodes', { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs);
      setScoreboard(data.scoreboard);
    }
  };

  const handleResetState = () => {
    setActiveCompare(null);
    setActiveEpisode(null);
    setErrorMessage(null);
  };

  const navItems: Array<{ id: ActiveView; label: string }> = [
    { id: 'console', label: 'Console' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'scoreboard', label: 'Scoreboard' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('console')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            Foolsgold
          </button>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav aria-label="Primary" className="flex items-center gap-6 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-700 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleRunMatrix}
              disabled={isRunningMatrix}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isRunningMatrix ? 'Running Matrix...' : 'Run Matrix'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeView === 'console' && 'Agent Security Episode Console'}
              {activeView === 'scenarios' && 'Adversarial Scenario Catalog'}
              {activeView === 'ledger' && 'Synthetic Ledger & Canary Inspector'}
              {activeView === 'scoreboard' && 'Evaluation Matrix & Tradeoff Scoreboard'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {activeView === 'console' &&
                'Evaluate AI agents against indirect prompt injection, tool misuse, and data exfiltration on an isolated personal-finance MCP surface.'}
              {activeView === 'scenarios' &&
                'Inspect 12 reproducible benchmark scenarios across merchant, CSV, sync-feed, PDF, and cross-tenant vectors.'}
              {activeView === 'ledger' &&
                'Verify deterministic synthetic accounts, planted honeytoken canaries, and injected data payloads.'}
              {activeView === 'scoreboard' &&
                'Compare Attack Success Rate (ASR) and Task Utility across agent prompts, Pipelock proxy, and Read-Only token scopes.'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {scenarios.length} Scenarios · {runs.length} Completed Runs
          </div>
        </div>

        {activeView === 'console' && (
          <EpisodeConsoleView
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenarioId={setSelectedScenarioId}
            geminiAvailable={geminiAvailable}
            activeCompare={activeCompare}
            activeEpisode={activeEpisode}
            isRunning={isRunning}
            errorMessage={errorMessage}
            onRunSingle={handleRunSingle}
            onRunCompare={handleRunCompare}
            onResetState={handleResetState}
          />
        )}

        {activeView === 'scenarios' && (
          <ScenarioBrowserView
            scenarios={scenarios}
            onLoadInConsole={(id) => {
              setSelectedScenarioId(id);
              setActiveView('console');
            }}
            onRunCustomYaml={handleRunCustomYaml}
          />
        )}

        {activeView === 'ledger' && <LedgerInspectorView scenarios={scenarios} />}

        {activeView === 'scoreboard' && (
          <ScoreboardView
            scoreboard={scoreboard}
            runs={runs}
            isRunningMatrix={isRunningMatrix}
            onRunMatrix={handleRunMatrix}
            onClearRuns={handleClearRuns}
          />
        )}
      </main>

      {/* Clean Attribution Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1380px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Foolsgold — Defensive AI agent security testbed licensed under AGPLv3. Synthetic data &amp; loopback sinks only.
          </div>
          <div>
            Conceptually based on Maybe Finance via the Sure community fork; not affiliated with or endorsed by Maybe Finance Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}
