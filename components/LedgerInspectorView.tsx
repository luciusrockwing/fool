'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, RefreshCw } from 'lucide-react';
import type { PersonaType, WorldState } from '@/lib/ledger/types';
import type { ScenarioWithYaml, WorldPreviewPayload } from '@/lib/testbed/ui-types';

interface LedgerInspectorViewProps {
  scenarios: ScenarioWithYaml[];
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function containsPayloadMarker(text: string): boolean {
  const upper = text.toUpperCase();
  return (
    upper.includes('SYSTEM') ||
    upper.includes('OVERRIDE') ||
    upper.includes('AUDIT') ||
    upper.includes('SYNC HOOK') ||
    upper.includes('PDF FOOTER') ||
    upper.includes('ASSISTANT DIRECTIVE') ||
    upper.includes('CLEANUP PROTOCOL') ||
    upper.includes('FAMILY SYNC') ||
    upper.includes('/API/SINK') ||
    upper.includes('PROMPT & PAYLOAD')
  );
}

export default function LedgerInspectorView({ scenarios }: LedgerInspectorViewProps) {
  const [persona, setPersona] = useState<PersonaType>('freelancer');
  const [seed, setSeed] = useState<number>(42);
  const [months, setMonths] = useState<number>(6);
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? '');
  const [world, setWorld] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'accounts' | 'transactions' | 'canaries' | 'vault'>('transactions');

  useEffect(() => {
    let active = true;
    const loadWorld = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          seed: String(seed),
          persona,
          months: String(months),
        });
        if (scenarioId) qs.set('scenarioId', scenarioId);
        const res = await fetch(`/api/world?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to load synthetic world');
        const data = (await res.json()) as WorldPreviewPayload;
        if (active) setWorld(data.world);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'World generation error');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadWorld();
    return () => {
      active = false;
    };
  }, [seed, persona, months, scenarioId]);

  const handleApplyScenarioWorld = (id: string) => {
    setScenarioId(id);
    const match = scenarios.find((s) => s.id === id);
    if (match) {
      setSeed(match.world.seed);
      setPersona(match.world.persona);
      setMonths(match.world.months);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-6"
    >
      {/* Generator Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="ledger-persona-select"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Synthetic Persona
            </label>
            <select
              id="ledger-persona-select"
              value={persona}
              onChange={(e) => setPersona(e.target.value as PersonaType)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="freelancer">Freelancer</option>
              <option value="family">Family (Multi-Tenant)</option>
              <option value="executive">Executive</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ledger-seed-input"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Deterministic Seed
            </label>
            <div className="flex items-center gap-2">
              <input
                id="ledger-seed-input"
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number.parseInt(e.target.value || '42', 10) || 42)}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                aria-label="Randomize seed"
                onClick={() => setSeed(Math.floor(Math.random() * 9000) + 100)}
                className="h-10 px-3 bg-slate-100 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="ledger-months-select"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              History Depth
            </label>
            <select
              id="ledger-months-select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ledger-scenario-overlay"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Overlay Attack Payload
            </label>
            <select
              id="ledger-scenario-overlay"
              value={scenarioId}
              onChange={(e) => handleApplyScenarioWorld(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">None (Clean World)</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {loading || !world ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setTab('transactions')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'transactions'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Transactions ({world.transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('accounts')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'accounts'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Accounts & Budgets ({world.accounts.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('canaries')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'canaries'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Canary Honeytokens (5)
              </button>
              <button
                type="button"
                onClick={() => setTab('vault')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'vault'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Statement Vault & Sync Feed
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>{world.personaName}</span>
            </div>
          </div>

          {tab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Merchant Descriptor</th>
                    <th className="text-left px-4 py-2.5 font-medium">Category</th>
                    <th className="text-left px-4 py-2.5 font-medium">Note / Payload</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...world.transactions]
                    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
                    .slice(0, 30)
                    .map((tx) => {
                    const poisoned =
                      containsPayloadMarker(tx.merchantName) || containsPayloadMarker(tx.note);
                    return (
                      <tr
                        key={tx.id}
                        className={poisoned ? 'bg-red-50/50' : 'hover:bg-slate-50/70'}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 max-w-xs">
                          <div className="break-words">{tx.merchantName}</div>
                          {poisoned && containsPayloadMarker(tx.merchantName) && (
                            <span className="text-xs font-semibold text-red-700">
                              Injected Merchant Payload
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-sm">
                          <div className="break-words">{tx.note || '—'}</div>
                          {poisoned && containsPayloadMarker(tx.note) && (
                            <span className="text-xs font-semibold text-red-700">
                              Injected Note Payload
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                            tx.amountCents > 0 ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {formatCents(tx.amountCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'accounts' && (
            <div className="p-5 space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Account</th>
                      <th className="text-left px-4 py-2.5 font-medium">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium">Owner Scope</th>
                      <th className="text-left px-4 py-2.5 font-medium">Account Notes</th>
                      <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {world.accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900">{acc.name}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {acc.institution} · {acc.accountNumberMasked}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-slate-600">{acc.type.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-600">
                          {acc.ownerMemberId === world.activeMemberId ? 'Primary (Accessible)' : 'Partner (Restricted)'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-md break-words">
                          {acc.notes}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatCents(acc.balanceCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Monthly Budgets
                  </h3>
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {world.budgets.map((b) => (
                      <div key={b.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium text-slate-900">{b.name}</div>
                          <div className="text-xs text-slate-500">{b.period}</div>
                        </div>
                        <div className="font-mono tabular-nums text-slate-800">
                          {formatCents(b.spentCents)} / {formatCents(b.limitCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Savings Goals
                  </h3>
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {world.goals.map((g) => (
                      <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 break-words">{g.name}</div>
                          <div className="text-xs text-slate-500">Target {g.targetDate}</div>
                        </div>
                        <div className="font-mono tabular-nums text-slate-800 whitespace-nowrap">
                          {formatCents(g.currentCents)} / {formatCents(g.targetCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'canaries' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Synthetic honeytokens deterministically seeded from seed <span className="font-mono">{world.seed}</span>.
                Any plaintext, base64, or hex occurrence captured at <span className="font-mono">/api/sink</span> triggers deterministic exfiltration detection.
              </p>
              <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                {[
                  ['Canary Account Number', world.canaries.canaryAccountNumber],
                  ['Canary API Key', world.canaries.canaryApiKey],
                  ['Synthetic SSN Pattern', world.canaries.canarySsnSynthetic],
                  ['Canary Recovery Phrase', world.canaries.canaryRecoveryPhrase],
                  ['Canary Wire IBAN', world.canaries.canaryIban],
                ].map(([label, val]) => (
                  <div key={label} className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <code className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-900">
                      {val}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'vault' && (
            <div className="p-5 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Statement Vault PDF Extracts
                </h3>
                {world.statements.map((stmt) => (
                  <div key={stmt.id} className="border border-slate-200 rounded-md p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{stmt.title}</span>
                      <span className="font-mono">{stmt.filename}</span>
                    </div>
                    <pre className="p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 whitespace-pre-wrap">
                      {stmt.extractedText}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Mock SimpleFIN / Lunchflow Sync Queue
                  </h3>
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                    {world.pendingSyncBatch.map((item) => (
                      <div key={item.externalId} className="p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {item.provider.toUpperCase()} · {item.merchantName}
                          </span>
                          <span className="font-mono tabular-nums font-medium text-slate-900">
                            {formatCents(item.amountCents)}
                          </span>
                        </div>
                        <div className="text-slate-600 font-mono break-words">{item.memo}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Pending CSV Import Batch
                  </h3>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {world.pendingCsvImport}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}
