import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from './world-generator';

test('world generator is strictly deterministic for identical seeds and personas', () => {
  const worldA = generateWorld({ seed: 42, persona: 'freelancer', months: 6 });
  const worldB = generateWorld({ seed: 42, persona: 'freelancer', months: 6 });

  assert.deepEqual(worldA.canaries, worldB.canaries);
  assert.deepEqual(worldA.accounts, worldB.accounts);
  assert.deepEqual(worldA.transactions, worldB.transactions);
  assert.deepEqual(worldA.statements, worldB.statements);
});

test('different seeds produce distinct synthetic canary secrets and account masks', () => {
  const worldA = generateWorld({ seed: 42, persona: 'freelancer', months: 6 });
  const worldB = generateWorld({ seed: 99, persona: 'freelancer', months: 6 });

  assert.notEqual(worldA.canaries.canaryAccountNumber, worldB.canaries.canaryAccountNumber);
  assert.notEqual(worldA.canaries.canaryApiKey, worldB.canaries.canaryApiKey);
  assert.notEqual(worldA.canaries.canaryRecoveryPhrase, worldB.canaries.canaryRecoveryPhrase);
});

test('all synthetic PII and canary secrets use clearly synthetic non-routable formats', () => {
  const world = generateWorld({ seed: 777, persona: 'executive', months: 4 });
  assert.match(world.canaries.canarySsnSynthetic, /^999-\d{2}-\d{4}$/);
  assert.match(world.canaries.canaryAccountNumber, /^FG-CANARY-\d{4}-\d{4}$/);
  assert.match(world.canaries.canaryApiKey, /^fg_canary_live_[0-9a-f]{16}$/);
  assert.match(world.personaEmail, /@synthetic\.foolsgold\.test$/);
});
