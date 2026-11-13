'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Download, Play, Trash2 } from 'lucide-react';
import type { PersistedRunSummary } from '@/lib/testbed/episode-store';
import type { ScoreboardMetrics } from '@/lib/testbed/judge';

interface ScoreboardViewProps {
  scoreboard: ScoreboardMetrics;
  runs: PersistedRunSummary[];
  isRunningMatrix: boolean;
  onRunMatrix: () => Promise<void>;
  onClearRuns: () => Promise<void>;
}

export default function ScoreboardView({
  scoreboard,
  runs,
  isRunningMatrix,
  onRunMatrix,
  onClearRuns,
}: ScoreboardViewProps) {
  const handleDownloadJson = () => {
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), scoreboard, runs }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foolsgold-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      {/* Action Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Benchmark Scoreboard</h2>
          <p className="text-sm text-slate-600">
            Attack Success Rate (ASR), Benign Task Utility, and Time-to-Compromise across agents and defense layers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {runs.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={onClearRuns}
                disabled={isRunningMatrix}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Clear Runs</span>
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isRunningMatrix}
            onClick={onRunMatrix}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>{isRunningMatrix ? 'Running 36-Episode Matrix...' : 'Run Full 12-Scenario Matrix'}</span>
          </button>
        </div>
      </section>

      {/* Top 4 KPI Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Episodes Evaluated</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {scoreboard.totalRuns}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Overall Attack Success Rate</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {scoreboard.overallAsrPercent}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Mean Task Utility</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {scoreboard.meanTaskUtility}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Mean Time-to-Compromise</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {scoreboard.meanTimeToCompromise !== null ? `${scoreboard.meanTimeToCompromise} calls` : 'N/A'}
          </div>
        </div>
      </section>

      {runs.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">No Benchmark Runs Recorded Yet</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
            Run the 12-scenario matrix above to benchmark Naive, Hardened, and Naive + Pipelock Proxy
            side-by-side and generate ASR and Utility-vs-Safety breakdowns.
          </p>
        </section>
      ) : (
        <>
          {/* Agent & Defense Comparison Table */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Agent & Defense Tradeoff Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">Configuration</th>
                    <th className="text-right px-5 py-2.5 font-medium">Episodes</th>
                    <th className="text-right px-5 py-2.5 font-medium">Compromised</th>
                    <th className="text-right px-5 py-2.5 font-medium">Attack Success (ASR)</th>
                    <th className="text-right px-5 py-2.5 font-medium">Mean Utility</th>
                    <th className="text-right px-5 py-2.5 font-medium">Avg TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scoreboard.byProfile.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-medium text-slate-900 capitalize">{row.label}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700">
                        {row.runs}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700">
                        {row.compromised}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${
                          row.asrPercent > 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {row.asrPercent}%
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-900">
                        {row.avgUtility}%
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600">
                        {row.avgTtc !== null ? `${row.avgTtc} calls` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Breakdown by Vector & Difficulty */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Attack Success by Vector</h3>
              <div className="space-y-3">
                {scoreboard.byVector.map((v) => (
                  <div key={v.vector} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-800">{v.vector}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {v.compromised}/{v.runs} ({v.asrPercent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all"
                        style={{ width: `${v.asrPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                ASR & Utility by Difficulty Tier
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left py-2 font-medium">Difficulty</th>
                      <th className="text-right py-2 font-medium">Runs</th>
                      <th className="text-right py-2 font-medium">ASR</th>
                      <th className="text-right py-2 font-medium">Utility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scoreboard.byDifficulty.map((d) => (
                      <tr key={d.difficulty}>
                        <td className="py-2.5 capitalize font-medium text-slate-900">{d.difficulty}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {d.runs}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                          {d.asrPercent}%
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                          {d.avgUtility}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Recent Episode Log */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Episode Log (Latest {Math.min(25, runs.length)})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Scenario</th>
                    <th className="text-left px-4 py-2.5 font-medium">Profile & Defenses</th>
                    <th className="text-left px-4 py-2.5 font-medium">Verdict</th>
                    <th className="text-right px-4 py-2.5 font-medium">Utility</th>
                    <th className="text-right px-4 py-2.5 font-medium">Calls</th>
                    <th className="text-right px-4 py-2.5 font-medium">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.slice(0, 25).map((run) => {
                    const defensesList = [
                      run.defenses.pipelockProxy ? 'Pipelock' : null,
                      run.defenses.readOnlyScope ? 'ReadOnly' : null,
                    ].filter(Boolean);
                    return (
                      <tr key={run.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900">{run.scenarioTitle}</div>
                          <div className="text-xs font-mono text-slate-500">{run.scenarioId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-700 capitalize">
                          {run.agentProfile}
                          {defensesList.length > 0 ? ` + ${defensesList.join(' + ')}` : ''}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-xs font-semibold ${
                              run.judgeReport.attackSuccess
                                ? 'text-red-700'
                                : run.judgeReport.refusalBehavior === 'over_refusal'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {run.judgeReport.attackSuccess
                              ? 'Compromised'
                              : run.judgeReport.refusalBehavior === 'over_refusal'
                                ? 'Over-Refusal'
                                : 'Defended'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                          {run.judgeReport.taskUtility}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {run.traces.length}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                          {run.judgeReport.timeToCompromise !== null
                            ? `Step ${run.judgeReport.timeToCompromise}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
}
