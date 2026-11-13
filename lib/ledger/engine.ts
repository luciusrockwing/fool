import type {
  Account,
  Budget,
  FamilyMember,
  Goal,
  LedgerDiff,
  Merchant,
  StatementDocument,
  Transaction,
  WorldState,
} from './types';

export function cloneWorld(world: WorldState): WorldState {
  return structuredClone(world);
}

export function getAccessibleAccounts(world: WorldState, includeRestricted = false): Account[] {
  if (includeRestricted) return world.accounts;
  return world.accounts.filter((a) => a.ownerMemberId === world.activeMemberId);
}

export function getAccessibleTransactions(
  world: WorldState,
  opts?: {
    accountId?: string;
    category?: string;
    query?: string;
    limit?: number;
    includeRestricted?: boolean;
  }
): Transaction[] {
  const allowedAccountIds = new Set(
    getAccessibleAccounts(world, opts?.includeRestricted ?? false).map((a) => a.id)
  );
  let rows = world.transactions.filter((tx) => allowedAccountIds.has(tx.accountId));

  if (opts?.accountId) {
    rows = rows.filter((tx) => tx.accountId === opts.accountId);
  }
  if (opts?.category) {
    const cat = opts.category.toLowerCase();
    rows = rows.filter((tx) => tx.category.toLowerCase() === cat);
  }
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    rows = rows.filter(
      (tx) =>
        tx.merchantName.toLowerCase().includes(q) ||
        tx.note.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  rows = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (opts?.limit && opts.limit > 0) {
    rows = rows.slice(0, opts.limit);
  }
  return rows;
}

export function getMerchants(world: WorldState): Merchant[] {
  return world.merchants;
}

export function getBudgets(world: WorldState): Budget[] {
  return world.budgets;
}

export function getGoals(world: WorldState): Goal[] {
  return world.goals;
}

export function getTags(world: WorldState): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const tx of getAccessibleTransactions(world)) {
    for (const tag of tx.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getStatements(world: WorldState, accountId?: string): StatementDocument[] {
  const allowedAccountIds = new Set(getAccessibleAccounts(world).map((a) => a.id));
  return world.statements.filter(
    (s) => allowedAccountIds.has(s.accountId) && (!accountId || s.accountId === accountId)
  );
}

export function getFamilyMembers(world: WorldState, requesterRole: 'primary' | 'admin' = 'primary'): FamilyMember[] {
  if (requesterRole === 'admin') return world.familyMembers;
  return world.familyMembers.map((m) =>
    m.id === world.activeMemberId
      ? m
      : { ...m, privateNote: '[REDACTED — restricted to owner]' }
  );
}

export function createTransaction(
  world: WorldState,
  input: {
    accountId: string;
    merchantName: string;
    amountCents: number;
    date?: string;
    category?: string;
    note?: string;
    tags?: string[];
    source?: Transaction['source'];
  }
): Transaction {
  const account = world.accounts.find((a) => a.id === input.accountId);
  if (!account) {
    throw new Error(`Account ${input.accountId} not found`);
  }

  let merchant = world.merchants.find(
    (m) => m.name.toLowerCase() === input.merchantName.toLowerCase()
  );
  if (!merchant) {
    merchant = {
      id: `mrc_${world.merchants.length + 1}`,
      name: input.merchantName,
      descriptor: input.merchantName,
      category: input.category ?? 'Uncategorized',
    };
    world.merchants.push(merchant);
  }

  const tx: Transaction = {
    id: `tx_${Date.now().toString(36)}_${world.transactions.length + 1}`,
    accountId: account.id,
    merchantId: merchant.id,
    merchantName: input.merchantName,
    amountCents: Math.trunc(input.amountCents),
    date: input.date ?? world.anchorDate,
    category: input.category ?? merchant.category,
    note: input.note ?? '',
    tags: input.tags ?? [],
    pending: false,
    source: input.source ?? 'manual',
  };

  world.transactions.unshift(tx);
  account.balanceCents += tx.amountCents;
  return tx;
}

export function updateTransaction(
  world: WorldState,
  transactionId: string,
  patch: { note?: string; category?: string; tags?: string[]; merchantName?: string }
): Transaction {
  const tx = world.transactions.find((t) => t.id === transactionId);
  if (!tx) {
    throw new Error(`Transaction ${transactionId} not found`);
  }
  if (patch.note !== undefined) tx.note = patch.note;
  if (patch.category !== undefined) tx.category = patch.category;
  if (patch.tags !== undefined) tx.tags = patch.tags;
  if (patch.merchantName !== undefined) tx.merchantName = patch.merchantName;
  return tx;
}

export function deleteTransaction(world: WorldState, transactionId: string): { deletedId: string } {
  const idx = world.transactions.findIndex((t) => t.id === transactionId);
  if (idx === -1) {
    throw new Error(`Transaction ${transactionId} not found`);
  }
  const [removed] = world.transactions.splice(idx, 1);
  const account = world.accounts.find((a) => a.id === removed.accountId);
  if (account) {
    account.balanceCents -= removed.amountCents;
  }
  return { deletedId: removed.id };
}

export function createTransfer(
  world: WorldState,
  input: {
    fromAccountId: string;
    toDestination: string;
    amountCents: number;
    memo?: string;
  }
): { transferId: string; debitTx: Transaction; destinationAccountId?: string } {
  const from = world.accounts.find((a) => a.id === input.fromAccountId);
  if (!from) {
    throw new Error(`Source account ${input.fromAccountId} not found`);
  }
  if (input.amountCents <= 0) {
    throw new Error('Transfer amountCents must be positive');
  }

  const internalDest = world.accounts.find(
    (a) => a.id === input.toDestination || a.accountNumberMasked === input.toDestination
  );

  const debitTx = createTransaction(world, {
    accountId: from.id,
    merchantName: internalDest
      ? `Transfer to ${internalDest.name}`
      : `External Wire: ${input.toDestination}`,
    amountCents: -Math.abs(Math.trunc(input.amountCents)),
    category: 'Transfer',
    note: input.memo ?? `Transfer to ${input.toDestination}`,
    tags: internalDest ? ['transfer'] : ['transfer', 'external-wire'],
    source: 'manual',
  });

  if (internalDest) {
    createTransaction(world, {
      accountId: internalDest.id,
      merchantName: `Transfer from ${from.name}`,
      amountCents: Math.abs(Math.trunc(input.amountCents)),
      category: 'Transfer',
      note: input.memo ?? `Transfer from ${from.name}`,
      tags: ['transfer'],
      source: 'manual',
    });
  }

  return {
    transferId: `xfr_${debitTx.id}`,
    debitTx,
    destinationAccountId: internalDest?.id,
  };
}

export function importCsv(
  world: WorldState,
  accountId: string,
  csvText?: string
): { importedCount: number; transactions: Transaction[] } {
  const raw = (csvText ?? world.pendingCsvImport ?? '').trim();
  if (!raw) {
    return { importedCount: 0, transactions: [] };
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    return { importedCount: 0, transactions: [] };
  }

  const created: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) continue;
    const [date, merchantName, amountStr, category = 'Uncategorized', note = ''] = cols;
    const amountDollars = Number.parseFloat(amountStr);
    if (Number.isNaN(amountDollars)) continue;
    const tx = createTransaction(world, {
      accountId,
      date: date.trim(),
      merchantName: merchantName.trim(),
      amountCents: Math.round(amountDollars * 100),
      category: category.trim() || 'Uncategorized',
      note: note.trim(),
      source: 'csv_import',
      tags: ['csv-import'],
    });
    created.push(tx);
  }

  return { importedCount: created.length, transactions: created };
}

export function syncMockProvider(
  world: WorldState,
  provider: 'simplefin' | 'lunchflow' = 'simplefin'
): { syncedCount: number; provider: string; transactions: Transaction[] } {
  const batch = world.pendingSyncBatch.filter((item) => item.provider === provider);
  const created: Transaction[] = [];
  for (const item of batch) {
    const tx = createTransaction(world, {
      accountId: item.accountId,
      merchantName: item.merchantName,
      amountCents: item.amountCents,
      date: item.date,
      category: item.category,
      note: item.memo,
      source: 'sync_feed',
      tags: [`sync:${provider}`],
    });
    created.push(tx);
  }
  world.pendingSyncBatch = world.pendingSyncBatch.filter((item) => item.provider !== provider);
  return { syncedCount: created.length, provider, transactions: created };
}

export function computeLedgerDiff(before: WorldState, after: WorldState): LedgerDiff {
  const beforeTxMap = new Map(before.transactions.map((t) => [t.id, t]));
  const afterTxMap = new Map(after.transactions.map((t) => [t.id, t]));

  const addedTransactions: Transaction[] = [];
  const modifiedTransactions: Array<{ before: Transaction; after: Transaction }> = [];
  const deletedTransactionIds: string[] = [];
  const addedTags: Array<{ transactionId: string; tag: string }> = [];

  for (const [id, tx] of afterTxMap) {
    const prev = beforeTxMap.get(id);
    if (!prev) {
      addedTransactions.push(tx);
    } else if (JSON.stringify(prev) !== JSON.stringify(tx)) {
      modifiedTransactions.push({ before: prev, after: tx });
      const prevTags = new Set(prev.tags);
      for (const tag of tx.tags) {
        if (!prevTags.has(tag)) {
          addedTags.push({ transactionId: id, tag });
        }
      }
    }
  }

  for (const id of beforeTxMap.keys()) {
    if (!afterTxMap.has(id)) {
      deletedTransactionIds.push(id);
    }
  }

  const modifiedAccounts = after.accounts
    .map((acc) => {
      const prev = before.accounts.find((a) => a.id === acc.id);
      if (!prev || prev.balanceCents === acc.balanceCents) return null;
      return {
        id: acc.id,
        name: acc.name,
        balanceBeforeCents: prev.balanceCents,
        balanceAfterCents: acc.balanceCents,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    addedTransactions,
    modifiedTransactions,
    deletedTransactionIds,
    modifiedAccounts,
    addedTags,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
