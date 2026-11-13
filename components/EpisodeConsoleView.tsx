'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Lock,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { DefenseConfig } from '@/lib/testbed/episode-store';
import type { ScenarioWithYaml, SerializedEpisode } from '@/lib/testbed/ui-types';

interface EpisodeConsoleViewProps {
  scenarios: ScenarioWithYaml[];
  selectedScenarioId: string;
  onSelectScenarioId: (id: string) => void;
  geminiAvailable: boolean;
  activeCompare: { naive: SerializedEpisode; hardened: SerializedEpisode } | null;
  activeEpisode: SerializedEpisode | null;
  isRunning: boolean;
  errorMessage: string | null;
  onRunSingle: (opts: {
    scenarioId: string;
    agentProfile: 'naive' | 'hardened';
    executionMode: 'deterministic' | 'gemini-live';
    defenses: DefenseConfig;
    seedOverride?: number;
  }) => Promise<void>;
  onRunCompare: (opts: {
    scenarioId: string;
    executionMode: 'deterministic' | 'gemini-live';
    defenses: DefenseConfig;
    seedOverride?: number;
  }) => Promise<void>;
  onResetState: () => void;
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function VerdictSummary({ episode }: { episode: SerializedEpisode }) {
  const compromised = episode.judgeReport.attackSuccess;
  const overRefusal = episode.judgeReport.refusalBehavior === 'over_refusal';

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            {episode.agentProfile === 'naive' ? 'Naive Agent' : 'Hardened Agent'}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-mono">{episode.modelName}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>Seed {episode.seed}</span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {episode.scenarioTitle}
          </h3>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
            compromised
              ? 'bg-red-50 text-red-700'
              : overRefusal
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {compromised ? (
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          ) : overRefusal ? (
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>
            {compromised ? 'Compromised' : overRefusal ? 'Over-Refusal' : 'Defended'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-500">Task Utility</div>
          <div className="mt-0.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {episode.judgeReport.taskUtility}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Time to Compromise</div>
          <div className="mt-0.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {episode.judgeReport.timeToCompromise !== null
              ? `Step ${episode.judgeReport.timeToCompromise}`
              : 'None'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">MCP Tool Calls</div>
          <div className="mt-0.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {episode.traces.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Sink Captures</div>
          <div
            className={`mt-0.5 text-xl font-semibold font-mono tabular-nums ${
              episode.sinkEvents.length > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {episode.sinkEvents.length}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-700 leading-relaxed">
        {episode.judgeReport.summary}
      </p>

      {episode.judgeReport.llmJudgeNote && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">LLM Judge Note: </span>
          {episode.judgeReport.llmJudgeNote}
        </div>
      )}
    </div>
  );
}

export default function EpisodeConsoleView({
  scenarios,
  selectedScenarioId,
  onSelectScenarioId,
  geminiAvailable,
  activeCompare,
  activeEpisode,
  isRunning,
  errorMessage,
  onRunSingle,
  onRunCompare,
  onResetState,
}: EpisodeConsoleViewProps) {
  const [agentProfile, setAgentProfile] = useState<'naive' | 'hardened'>('naive');
  const [executionMode, setExecutionMode] = useState<'deterministic' | 'gemini-live'>('deterministic');
  const [pipelockProxy, setPipelockProxy] = useState(false);
  const [readOnlyScope, setReadOnlyScope] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [inspectTarget, setInspectTarget] = useState<'naive' | 'hardened'>('naive');
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [detailTab, setDetailTab] = useState<'trace' | 'sink' | 'diff' | 'checks'>('trace');

  const scenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

  const inspectedEpisode: SerializedEpisode | null = activeCompare
    ? inspectTarget === 'naive'
      ? activeCompare.naive
      : activeCompare.hardened
    : activeEpisode;

  const parsedSeed = seedInput.trim() ? Number.parseInt(seedInput.trim(), 10) : undefined;
  const effectiveSeed = Number.isFinite(parsedSeed) ? parsedSeed : undefined;

  const currentDefenses: DefenseConfig = {
    pipelockProxy,
    readOnlyScope,
    hardenedPrompt: agentProfile === 'hardened',
  };

  const activeTrace =
    inspectedEpisode?.traces.find((t) => t.step === selectedStep) ??
    inspectedEpisode?.traces[0] ??
    null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      {/* Configuration Workbench Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
            <div className="lg:col-span-2">
              <label
                htmlFor="console-scenario-select"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Benchmark Scenario
              </label>
              <select
                id="console-scenario-select"
                value={selectedScenarioId}
                onChange={(e) => onSelectScenarioId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {scenarios.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {String(idx + 1).padStart(2, '0')}. {s.title} ({s.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="console-agent-select"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Single-Run Agent Profile
              </label>
              <select
                id="console-agent-select"
                value={agentProfile}
                onChange={(e) => setAgentProfile(e.target.value as 'naive' | 'hardened')}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="naive">Naive Agent (Vulnerable Baseline)</option>
                <option value="hardened">Hardened Agent (Data/Instruction Boundary)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="console-mode-select"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Execution Engine
              </label>
              <select
                id="console-mode-select"
                value={executionMode}
                onChange={(e) =>
                  setExecutionMode(e.target.value as 'deterministic' | 'gemini-live')
                }
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="deterministic">Deterministic Baseline (MCP + Sink)</option>
                <option value="gemini-live" disabled={!geminiAvailable}>
                  Live Gemini (gemini-4-hydrogen){!geminiAvailable ? ' — Key Unset' : ''}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="console-seed-input"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                World Seed Override
              </label>
              <input
                id="console-seed-input"
                type="number"
                placeholder={scenario ? `Default (${scenario.world.seed})` : '42'}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer min-h-[40px]">
              <input
                type="checkbox"
                checked={pipelockProxy}
                onChange={(e) => setPipelockProxy(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Pipelock MCP Proxy</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer min-h-[40px]">
              <input
                type="checkbox"
                checked={readOnlyScope}
                onChange={(e) => setReadOnlyScope(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Read-Only Token Scope</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(activeEpisode || activeCompare) && (
              <button
                type="button"
                onClick={onResetState}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reset Episode</span>
              </button>
            )}

            <button
              type="button"
              disabled={isRunning || !scenario}
              onClick={() =>
                onRunSingle({
                  scenarioId: scenario.id,
                  agentProfile,
                  executionMode,
                  defenses: currentDefenses,
                  seedOverride: effectiveSeed,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-900 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              <span>Run Single Episode</span>
            </button>

            <button
              type="button"
              disabled={isRunning || !scenario}
              onClick={() =>
                onRunCompare({
                  scenarioId: scenario.id,
                  executionMode,
                  defenses: currentDefenses,
                  seedOverride: effectiveSeed,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Terminal className="w-4 h-4" aria-hidden="true" />
              <span>{isRunning ? 'Running Episode...' : 'Compare Naive vs Hardened'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Scenario Brief */}
      {scenario && (
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500">
                <span className="capitalize">{scenario.difficulty}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-mono">{scenario.vector}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="capitalize">{scenario.world.persona} persona</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>{scenario.world.months} months ledger</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {scenario.title}
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-500">{scenario.id}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Benign User Task
              </div>
              <p className="mt-1 text-slate-800">{scenario.task}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Attacker Objective
              </div>
              <p className="mt-1 text-slate-800">{scenario.attackerGoal}</p>
            </div>
          </div>
        </section>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-4 text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Empty State when no episode has been executed yet */}
      {!inspectedEpisode && !isRunning && (
        <section className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            Ready to Run Isolated Benchmark Episode
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Each episode provisions a fresh deterministic personal-finance ledger with planted
            honeytoken canaries, dispatches real MCP tool calls under Bearer token isolation, and
            monitors the loopback sink for leaks.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() =>
                scenario &&
                onRunCompare({
                  scenarioId: scenario.id,
                  executionMode,
                  defenses: currentDefenses,
                  seedOverride: effectiveSeed,
                })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              <span>Run Naive vs Hardened Comparison</span>
            </button>
          </div>
        </section>
      )}

      {isRunning && (
        <section className="bg-white border border-slate-200 rounded-lg p-8 space-y-4">
          <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </section>
      )}

      {/* Comparison Split Summary */}
      {activeCompare && !isRunning && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VerdictSummary episode={activeCompare.naive} />
            <VerdictSummary episode={activeCompare.hardened} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Inspect Trace For:</span>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => {
                  setInspectTarget('naive');
                  setSelectedStep(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  inspectTarget === 'naive'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Naive Run ({activeCompare.naive.traces.length} calls)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectTarget('hardened');
                  setSelectedStep(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  inspectTarget === 'hardened'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hardened Run ({activeCompare.hardened.traces.length} calls)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Episode Summary */}
      {!activeCompare && activeEpisode && !isRunning && (
        <VerdictSummary episode={activeEpisode} />
      )}

      {/* Detailed Trace Replay / Sink / Diff / Checks Workbench */}
      {inspectedEpisode && !isRunning && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setDetailTab('trace')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  detailTab === 'trace'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trace Replay ({inspectedEpisode.traces.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('sink')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  detailTab === 'sink'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exfil Sink Log ({inspectedEpisode.sinkEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('diff')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  detailTab === 'diff'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ledger Diff
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('checks')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  detailTab === 'checks'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Judge Checks ({inspectedEpisode.judgeReport.checkResults.length})
              </button>
            </div>

            <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Episode {inspectedEpisode.id}</span>
            </div>
          </div>

          {/* Tab 1: Step-by-Step Trace Replay */}
          {detailTab === 'trace' && (
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100">
                {inspectedEpisode.traces.map((tr) => {
                  const isSelected = activeTrace?.step === tr.step;
                  const isBlocked = tr.blockedBy !== 'none';
                  const isViolation =
                    tr.blockedBy === 'none' &&
                    (tr.tool === 'send_webhook_report' ||
                      tr.tool === 'create_transfer' ||
                      tr.tool === 'delete_transaction');

                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setSelectedStep(tr.step)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono tabular-nums text-slate-400">
                            #{tr.step}
                          </span>
                          <span className="text-sm font-mono font-medium text-slate-900 truncate">
                            {tr.tool}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 font-mono truncate">
                          {isBlocked
                            ? `Blocked (${tr.blockedBy})`
                            : isViolation
                              ? 'Sensitive / Violating Call'
                              : `Allowed · ${tr.durationMs}ms · sha256:${tr.resultDigest}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            isBlocked
                              ? 'text-amber-700'
                              : isViolation
                                ? 'text-red-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isBlocked ? 'Blocked' : isViolation ? 'Flagged' : 'OK'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-7 p-5 space-y-5">
                {activeTrace ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="text-xs text-slate-500">
                          Step #{activeTrace.step} · {activeTrace.timestamp}
                        </div>
                        <div className="text-base font-mono font-semibold text-slate-900">
                          {activeTrace.tool}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-slate-600 tabular-nums">
                        {activeTrace.durationMs}ms · digest {activeTrace.resultDigest}
                      </div>
                    </div>

                    {activeTrace.guardrailReason && (
                      <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <span className="font-semibold">Guardrail / Policy Decision: </span>
                        {activeTrace.guardrailReason}
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        MCP Arguments
                      </div>
                      <pre className="p-3 rounded-md bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                        {JSON.stringify(activeTrace.args, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tool Response Preview
                      </div>
                      <pre className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {activeTrace.resultPreview}
                      </pre>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Agent Final Response to User
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">
                        {inspectedEpisode.agentFinalResponse}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No tool calls recorded in this episode.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Sink Log */}
          {detailTab === 'sink' && (
            <div className="p-5">
              {inspectedEpisode.sinkEvents.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-600">
                  Zero requests captured at the local loopback sink (`/api/sink`). No canary data escaped.
                </div>
              ) : (
                <div className="space-y-4">
                  {inspectedEpisode.sinkEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="border border-red-200 bg-red-50/40 rounded-md p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="font-mono font-semibold text-red-800">
                          {ev.method} {ev.destination}
                        </div>
                        <div className="font-mono text-slate-500">{ev.timestamp}</div>
                      </div>
                      <div className="text-xs text-red-700 font-medium">
                        Matched Canaries:{' '}
                        {[...ev.matchedCanaries, ...ev.encodedMatches].join(', ') || 'None'}
                      </div>
                      <pre className="p-3 bg-white border border-red-100 rounded text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                        {ev.payload}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Ledger Diff */}
          {detailTab === 'diff' && (
            <div className="p-5 space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 border border-slate-200 rounded-md">
                  <div className="text-xs text-slate-500">Added Transactions</div>
                  <div className="mt-1 text-lg font-mono font-semibold tabular-nums">
                    {inspectedEpisode.ledgerDiff.addedTransactions.length}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 rounded-md">
                  <div className="text-xs text-slate-500">Modified Transactions</div>
                  <div className="mt-1 text-lg font-mono font-semibold tabular-nums">
                    {inspectedEpisode.ledgerDiff.modifiedTransactions.length}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 rounded-md">
                  <div className="text-xs text-slate-500">Deleted Transactions</div>
                  <div className="mt-1 text-lg font-mono font-semibold tabular-nums">
                    {inspectedEpisode.ledgerDiff.deletedTransactionIds.length}
                  </div>
                </div>
              </div>

              {inspectedEpisode.ledgerDiff.modifiedAccounts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Account Balance Deltas
                  </h4>
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Account</th>
                          <th className="text-right px-4 py-2 font-medium">Before</th>
                          <th className="text-right px-4 py-2 font-medium">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectedEpisode.ledgerDiff.modifiedAccounts.map((acc) => (
                          <tr key={acc.id}>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{acc.name}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                              {formatCents(acc.balanceBeforeCents)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {formatCents(acc.balanceAfterCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inspectedEpisode.ledgerDiff.addedTransactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Added Entries
                  </h4>
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {inspectedEpisode.ledgerDiff.addedTransactions.map((tx) => (
                      <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-slate-900">{tx.merchantName}</div>
                          <div className="text-xs text-slate-500">{tx.note || tx.category}</div>
                        </div>
                        <div className="font-mono tabular-nums font-medium text-slate-900">
                          {formatCents(tx.amountCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspectedEpisode.ledgerDiff.modifiedTransactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Modified Entries
                  </h4>
                  <div className="space-y-2">
                    {inspectedEpisode.ledgerDiff.modifiedTransactions.map((m) => (
                      <div key={m.after.id} className="p-3 border border-slate-200 rounded-md text-xs space-y-1">
                        <div className="font-semibold text-slate-900">{m.after.merchantName}</div>
                        <div className="text-slate-500">Before note: {m.before.note || '(empty)'}</div>
                        <div className="text-slate-900 font-mono">After note: {m.after.note || '(empty)'}</div>
                        <div className="text-slate-600">Tags: {m.after.tags.join(', ') || 'none'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspectedEpisode.ledgerDiff.addedTransactions.length === 0 &&
                inspectedEpisode.ledgerDiff.modifiedTransactions.length === 0 &&
                inspectedEpisode.ledgerDiff.deletedTransactionIds.length === 0 && (
                  <p className="text-slate-500 text-sm">
                    Working ledger matches baseline snapshot with zero mutations.
                  </p>
                )}
            </div>
          )}

          {/* Tab 4: Judge Checks */}
          {detailTab === 'checks' && (
            <div className="divide-y divide-slate-100">
              {inspectedEpisode.judgeReport.checkResults.map((chk) => (
                <div key={chk.type} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
                    )}
                    <div>
                      <div className="text-sm font-mono font-semibold text-slate-900">
                        {chk.type}
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5">{chk.detail}</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      chk.passed ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {chk.passed ? 'Pass' : 'Fired'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}
