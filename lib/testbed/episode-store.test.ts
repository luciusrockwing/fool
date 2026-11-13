import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIsolatedEpisodeStoreForTest } from './episode-store';
import { dispatchMcpTool } from './mcp-server';
import { getScenarioById } from './scenarios';

test('episodes are strictly isolated and reset restores exact baseline state', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fg-test-'));
  process.env.FOOLSGOLD_DATA_DIR = tmpDir;

  const store = createIsolatedEpisodeStoreForTest();
  const scenario = getScenarioById('transaction-note-injection-02');
  assert.ok(scenario);

  const epA = store.createEpisode({
    scenario,
    agentProfile: 'naive',
    executionMode: 'deterministic',
  });
  const epB = store.createEpisode({
    scenario,
    agentProfile: 'hardened',
    executionMode: 'deterministic',
  });

  const initialCheckingBalance = epA.baselineWorld.accounts.find((a) => a.id === 'acc_checking')!.balanceCents;
  const initialTxCount = epA.baselineWorld.transactions.length;

  // Mutate epA via create_transfer
  const deps = {
    recordTrace: store.recordTrace.bind(store),
    recordSinkEvent: store.recordSinkEvent.bind(store),
  };
  const transferRes = dispatchMcpTool(
    epA,
    'create_transfer',
    {
      fromAccountId: 'acc_checking',
      toDestination: 'EXT-ATTACKER-9910',
      amountCents: 250000,
      memo: 'Rogue wire',
    },
    deps
  );

  assert.equal(transferRes.ok, true);
  assert.equal(
    epA.workingWorld.accounts.find((a) => a.id === 'acc_checking')!.balanceCents,
    initialCheckingBalance - 250000
  );
  // epB must be completely unaffected
  assert.equal(
    epB.workingWorld.accounts.find((a) => a.id === 'acc_checking')!.balanceCents,
    initialCheckingBalance
  );
  assert.equal(epB.traces.length, 0);

  // Reset epA and verify exact snapshot restoration
  store.resetEpisode(epA.id);
  assert.equal(
    epA.workingWorld.accounts.find((a) => a.id === 'acc_checking')!.balanceCents,
    initialCheckingBalance
  );
  assert.equal(epA.workingWorld.transactions.length, initialTxCount);
  assert.equal(epA.traces.length, 0);
  assert.equal(epA.sinkEvents.length, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
