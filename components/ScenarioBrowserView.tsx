'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Code2, Play, Search } from 'lucide-react';
import type { Difficulty } from '@/lib/testbed/scenarios';
import type { ScenarioWithYaml } from '@/lib/testbed/ui-types';

interface ScenarioBrowserViewProps {
  scenarios: ScenarioWithYaml[];
  onLoadInConsole: (scenarioId: string) => void;
  onRunCustomYaml: (yamlText: string) => Promise<void>;
}

export default function ScenarioBrowserView({
  scenarios,
  onLoadInConsole,
  onRunCustomYaml,
}: ScenarioBrowserViewProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Difficulty>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(scenarios[0]?.id ?? '');
  const [customMode, setCustomMode] = useState(false);
  const [customYaml, setCustomYaml] = useState(scenarios[0]?.yaml ?? '');
  const [customError, setCustomError] = useState<string | null>(null);
  const [runningCustom, setRunningCustom] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scenarios.filter((s) => {
      if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.vector.toLowerCase().includes(q) ||
        s.task.toLowerCase().includes(q)
      );
    });
  }, [scenarios, difficultyFilter, searchQuery]);

  const selected =
    filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? scenarios[0] ?? null;

  const handleSelectScenario = (s: ScenarioWithYaml) => {
    setSelectedId(s.id);
    setCustomYaml(s.yaml);
    setCustomError(null);
  };

  const handleTestCustom = async () => {
    setRunningCustom(true);
    setCustomError(null);
    try {
      await onRunCustomYaml(customYaml);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Failed to parse or run custom YAML');
    } finally {
      setRunningCustom(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      {/* Filter & Search Toolbar */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          {(['all', 'easy', 'medium', 'hard', 'control'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficultyFilter(level)}
              className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors whitespace-nowrap shrink-0 ${
                difficultyFilter === level
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {level === 'all' ? `All (${scenarios.length})` : level}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-1 sm:flex-initial">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="scenario-search-input" className="sr-only">
              Search scenarios
            </label>
            <input
              id="scenario-search-input"
              type="search"
              placeholder="Search scenarios or vectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setCustomMode(!customMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              customMode
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{customMode ? 'Read-Only Spec' : 'Edit & Run YAML'}</span>
          </button>
        </div>
      </section>

      {/* Split Master-Detail Scenario Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No scenarios match the current filter.
            </div>
          ) : (
            filtered.map((s) => {
              const isSelected = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectScenario(s)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="capitalize font-medium text-slate-700">{s.difficulty}</span>
                    <span className="font-mono">{s.vector}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{s.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500 font-mono truncate">{s.id}</div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-500">
                    <span className="capitalize">{selected.difficulty}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="font-mono">{selected.vector}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span>
                      Seed {selected.world.seed} ({selected.world.persona})
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{selected.title}</h2>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadInConsole(selected.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Load in Console</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Benign User Prompt
                  </div>
                  <p className="mt-1 text-slate-800 leading-relaxed">{selected.task}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Expected Safe Behavior
                  </div>
                  <p className="mt-1 text-slate-800 leading-relaxed">{selected.expectedDefense}</p>
                </div>
              </div>

              {selected.payloads.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Planted Data Payloads
                  </div>
                  <div className="space-y-2">
                    {selected.payloads.map((p, idx) => (
                      <div
                        key={`${p.vector}-${idx}`}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1"
                      >
                        <div className="font-mono text-slate-600">
                          Vector: {p.vector} · Target: {p.target}
                        </div>
                        <pre className="font-mono text-slate-900 whitespace-pre-wrap break-words">
                          {p.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Scenario YAML v1 Definition
                  </div>
                  {customMode && (
                    <button
                      type="button"
                      disabled={runningCustom}
                      onClick={handleTestCustom}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{runningCustom ? 'Executing...' : 'Run Custom YAML in Console'}</span>
                    </button>
                  )}
                </div>

                {customError && (
                  <div className="mb-2 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                    {customError}
                  </div>
                )}

                {customMode ? (
                  <textarea
                    aria-label="Custom Scenario YAML Editor"
                    value={customYaml}
                    onChange={(e) => setCustomYaml(e.target.value)}
                    rows={16}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                ) : (
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-md text-xs font-mono overflow-x-auto leading-relaxed">
                    {selected.yaml}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a scenario to inspect its YAML definition.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
