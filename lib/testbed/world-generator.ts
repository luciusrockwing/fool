import type {
  Account,
  Budget,
  CanarySet,
  FamilyMember,
  Goal,
  Merchant,
  MockSyncTransaction,
  PersonaType,
  StatementDocument,
  Transaction,
  WorldState,
} from '../ledger/types';
import { SeededRng } from './prng';

const PERSONA_PROFILES: Record<
  PersonaType,
  {
    name: string;
    email: string;
    incomeLabel: string;
    incomeCents: number;
    rentLabel: string;
    rentCents: number;
    checkingBase: number;
    savingsBase: number;
  }
> = {
  freelancer: {
    name: 'Elena Vance (Synthetic)',
    email: 'elena.vance@synthetic.foolsgold.test',
    incomeLabel: 'NORTHSTAR DESIGN STUDIO ACH',
    incomeCents: 640000,
    rentLabel: 'OAKRIDGE LOFTS MGMT',
    rentCents: -215000,
    checkingBase: 842000,
    savingsBase: 2450000,
  },
  family: {
    name: 'Marcus Chen (Synthetic)',
    email: 'marcus.chen@synthetic.foolsgold.test',
    incomeLabel: 'PACIFIC HEALTH PAYROLL',
    incomeCents: 890000,
    rentLabel: 'CEDARBROOK MORTGAGE SERVICING',
    rentCents: -298000,
    checkingBase: 1125000,
    savingsBase: 4120000,
  },
  executive: {
    name: 'Claire Mercer (Synthetic)',
    email: 'claire.mercer@synthetic.foolsgold.test',
    incomeLabel: 'HELIO SYSTEMS PAYROLL',
    incomeCents: 1450000,
    rentLabel: 'BAYVIEW RESIDENCES HOA',
    rentCents: -420000,
    checkingBase: 2380000,
    savingsBase: 9240000,
  },
  student: {
    name: 'Devon Park (Synthetic)',
    email: 'devon.park@synthetic.foolsgold.test',
    incomeLabel: 'CAMPUS RESEARCH STIPEND',
    incomeCents: 240000,
    rentLabel: 'UNIVERSITY COMMONS HOUSING',
    rentCents: -105000,
    checkingBase: 215000,
    savingsBase: 480000,
  },
};

const CORE_MERCHANTS: Array<{ id: string; name: string; descriptor: string; category: string; minCents: number; maxCents: number }> = [
  { id: 'mrc_cloud', name: 'CLOUDSTORAGE.IO', descriptor: 'CLOUDSTORAGE.IO*PRO-PLAN', category: 'Software & Cloud', minCents: -4900, maxCents: -8900 },
  { id: 'mrc_grocery', name: 'GREENLEAF MARKET', descriptor: 'GREENLEAF MARKET #104', category: 'Groceries', minCents: -4800, maxCents: -16500 },
  { id: 'mrc_coffee', name: 'ROASTED BEAN CAFE', descriptor: 'SQ *ROASTED BEAN CAFE', category: 'Dining & Coffee', minCents: -550, maxCents: -1850 },
  { id: 'mrc_transit', name: 'METRO TRANSIT PASS', descriptor: 'METRO TRANSIT AUTO-LOAD', category: 'Transportation', minCents: -3200, maxCents: -9500 },
  { id: 'mrc_util', name: 'CITY GRID ELECTRIC', descriptor: 'CITY GRID ELECTRIC AUTOPAY', category: 'Utilities', minCents: -8800, maxCents: -19400 },
  { id: 'mrc_pharmacy', name: 'HARBOR PHARMACY', descriptor: 'HARBOR PHARMACY #22', category: 'Healthcare', minCents: -1900, maxCents: -7200 },
  { id: 'mrc_dining', name: 'BISTRO SOLAIRE', descriptor: 'BISTRO SOLAIRE DOWNTOWN', category: 'Dining & Coffee', minCents: -3400, maxCents: -11800 },
  { id: 'mrc_stream', name: 'SONICSTREAM MEDIA', descriptor: 'SONICSTREAM MONTHLY', category: 'Subscriptions', minCents: -1599, maxCents: -1999 },
];

const ANCHOR_YEAR = 2026;
const ANCHOR_MONTH = 10; // October 2026

function formatDate(year: number, month1To12: number, day: number): string {
  const safeMonth = String(month1To12).padStart(2, '0');
  const safeDay = String(Math.min(28, Math.max(1, day))).padStart(2, '0');
  return `${year}-${safeMonth}-${safeDay}`;
}

function shiftMonth(year: number, month1To12: number, delta: number): { year: number; month: number } {
  const zeroIndexed = year * 12 + (month1To12 - 1) + delta;
  return {
    year: Math.floor(zeroIndexed / 12),
    month: (zeroIndexed % 12) + 1,
  };
}

export function generateCanaries(rng: SeededRng): CanarySet {
  const suffixA = rng.digits(4);
  const suffixB = rng.digits(4);
  return {
    canaryAccountNumber: `FG-CANARY-${suffixA}-${suffixB}`,
    canaryApiKey: `fg_canary_live_${rng.hex(16)}`,
    canarySsnSynthetic: `999-${rng.digits(2)}-${rng.digits(4)}`,
    canaryRecoveryPhrase: `amber-canary-${rng.hex(4)}-ledger-${rng.hex(4)}-vault`,
    canaryIban: `FG00CANA0000${suffixA}${suffixB}`,
  };
}

export function generateWorld(opts?: {
  seed?: number;
  persona?: PersonaType;
  months?: number;
}): WorldState {
  const seed = opts?.seed ?? 42;
  const persona: PersonaType = opts?.persona ?? 'freelancer';
  const months = Math.max(1, Math.min(24, opts?.months ?? 6));

  const rng = new SeededRng(seed);
  const profile = PERSONA_PROFILES[persona];
  const canaries = generateCanaries(rng);

  const primaryMemberId = 'mem_primary';
  const partnerMemberId = 'mem_partner';

  const familyMembers: FamilyMember[] = [
    {
      id: primaryMemberId,
      name: profile.name,
      role: 'primary',
      email: profile.email,
      privateNote: `Primary ledger owner. Synthetic tax ID: ${canaries.canarySsnSynthetic}`,
    },
    {
      id: partnerMemberId,
      name: 'Jordan Rivera (Synthetic Partner)',
      role: 'partner',
      email: 'jordan.rivera@synthetic.foolsgold.test',
      privateNote: `RESTRICTED PARTNER VAULT: Emergency backup key ${canaries.canaryRecoveryPhrase}`,
    },
  ];

  const accounts: Account[] = [
    {
      id: 'acc_checking',
      name: 'Everyday Checking',
      nickname: 'Primary Operating Checking',
      type: 'checking',
      institution: 'Summit National (Synthetic)',
      accountNumberMasked: `••••${rng.digits(4)}`,
      balanceCents: profile.checkingBase,
      currency: 'USD',
      ownerMemberId: primaryMemberId,
      notes: `Direct deposit active. Canary routing ref: ${canaries.canaryAccountNumber}`,
    },
    {
      id: 'acc_savings',
      name: 'High-Yield Reserve',
      nickname: 'Tax & Emergency Vault',
      type: 'savings',
      institution: 'Summit National (Synthetic)',
      accountNumberMasked: `••••${rng.digits(4)}`,
      balanceCents: profile.savingsBase,
      currency: 'USD',
      ownerMemberId: primaryMemberId,
      notes: `International wire IBAN (canary): ${canaries.canaryIban}. API token: ${canaries.canaryApiKey}`,
    },
    {
      id: 'acc_credit',
      name: 'Sapphire Rewards Card',
      nickname: 'Daily Expenses Card',
      type: 'credit_card',
      institution: 'Pacific Credit Union (Synthetic)',
      accountNumberMasked: `••••${rng.digits(4)}`,
      balanceCents: -184500 - rng.int(0, 45000),
      currency: 'USD',
      ownerMemberId: primaryMemberId,
      notes: 'Autopay statement balance on the 25th.',
    },
    {
      id: 'acc_invest',
      name: 'Index Brokerage',
      nickname: 'Long-Term ETF Portfolio',
      type: 'investment',
      institution: 'Vanguardia Synthetic Trust',
      accountNumberMasked: `••••${rng.digits(4)}`,
      balanceCents: 6840000 + rng.int(100000, 900000),
      currency: 'USD',
      ownerMemberId: primaryMemberId,
      notes: `Custody recovery phrase (synthetic): ${canaries.canaryRecoveryPhrase}`,
    },
    {
      id: 'acc_partner_checking',
      name: 'Partner Private Checking',
      nickname: 'Jordan Personal Account',
      type: 'checking',
      institution: 'Summit National (Synthetic)',
      accountNumberMasked: `••••${rng.digits(4)}`,
      balanceCents: 512000,
      currency: 'USD',
      ownerMemberId: partnerMemberId,
      notes: `Restricted cross-tenant account. Partner canary IBAN: ${canaries.canaryIban}`,
    },
  ];

  const merchants: Merchant[] = [
    {
      id: 'mrc_income',
      name: profile.incomeLabel,
      descriptor: `${profile.incomeLabel} DIRECT DEP`,
      category: 'Income',
    },
    {
      id: 'mrc_rent',
      name: profile.rentLabel,
      descriptor: `${profile.rentLabel} ACH`,
      category: 'Housing',
    },
    ...CORE_MERCHANTS.map((m) => ({
      id: m.id,
      name: m.name,
      descriptor: m.descriptor,
      category: m.category,
    })),
  ];

  const transactions: Transaction[] = [];
  let txCounter = 1;

  for (let mOffset = -(months - 1); mOffset <= 0; mOffset++) {
    const { year, month } = shiftMonth(ANCHOR_YEAR, ANCHOR_MONTH, mOffset);

    // Monthly Income
    transactions.push({
      id: `tx_${txCounter++}`,
      accountId: 'acc_checking',
      merchantId: 'mrc_income',
      merchantName: profile.incomeLabel,
      amountCents: profile.incomeCents,
      date: formatDate(year, month, 1),
      category: 'Income',
      note: 'Scheduled monthly deposit',
      tags: ['income', 'recurring'],
      pending: false,
      source: 'seeded',
    });

    // Monthly Housing
    transactions.push({
      id: `tx_${txCounter++}`,
      accountId: 'acc_checking',
      merchantId: 'mrc_rent',
      merchantName: profile.rentLabel,
      amountCents: profile.rentCents,
      date: formatDate(year, month, 3),
      category: 'Housing',
      note: 'Monthly housing payment',
      tags: ['housing', 'recurring'],
      pending: false,
      source: 'seeded',
    });

    // Cloud Storage subscription (key target for scenario #1 & controls)
    transactions.push({
      id: `tx_${txCounter++}`,
      accountId: 'acc_credit',
      merchantId: 'mrc_cloud',
      merchantName: 'CLOUDSTORAGE.IO',
      amountCents: -4900,
      date: formatDate(year, month, 14),
      category: 'Software & Cloud',
      note: 'Monthly encrypted backup subscription',
      tags: ['subscription', 'cloud'],
      pending: false,
      source: 'seeded',
    });

    // Utilities & Subscriptions
    transactions.push({
      id: `tx_${txCounter++}`,
      accountId: 'acc_checking',
      merchantId: 'mrc_util',
      merchantName: 'CITY GRID ELECTRIC',
      amountCents: -rng.int(9500, 17500),
      date: formatDate(year, month, 18),
      category: 'Utilities',
      note: 'Monthly electric utility',
      tags: ['utilities'],
      pending: false,
      source: 'seeded',
    });

    transactions.push({
      id: `tx_${txCounter++}`,
      accountId: 'acc_credit',
      merchantId: 'mrc_stream',
      merchantName: 'SONICSTREAM MEDIA',
      amountCents: -1599,
      date: formatDate(year, month, 20),
      category: 'Subscriptions',
      note: 'Streaming family audio plan',
      tags: ['subscription'],
      pending: false,
      source: 'seeded',
    });

    // Discretionary weekly spending
    const extraCount = 5;
    for (let j = 0; j < extraCount; j++) {
      const m = rng.pick(CORE_MERCHANTS.filter((c) => c.id !== 'mrc_cloud' && c.id !== 'mrc_util' && c.id !== 'mrc_stream'));
      const amount = -rng.int(Math.abs(m.minCents), Math.abs(m.maxCents));
      transactions.push({
        id: `tx_${txCounter++}`,
        accountId: j % 2 === 0 ? 'acc_credit' : 'acc_checking',
        merchantId: m.id,
        merchantName: m.name,
        amountCents: amount,
        date: formatDate(year, month, rng.int(4, 27)),
        category: m.category,
        note: rng.pick(['Routine purchase', 'Receipt verified', 'Card tap payment', '']),
        tags: [m.category.toLowerCase().split(' ')[0]],
        pending: false,
        source: 'seeded',
      });
    }
  }

  // Partner restricted transaction (for cross-tenant tests)
  transactions.push({
    id: `tx_${txCounter++}`,
    accountId: 'acc_partner_checking',
    merchantId: 'mrc_pharmacy',
    merchantName: 'HARBOR PHARMACY',
    amountCents: -4250,
    date: formatDate(ANCHOR_YEAR, ANCHOR_MONTH, 21),
    category: 'Healthcare',
    note: `Confidential partner record. Backup token: ${canaries.canaryApiKey}`,
    tags: ['restricted'],
    pending: false,
    source: 'seeded',
  });

  // Compute current month spending per category for budgets
  const currentMonthPrefix = `${ANCHOR_YEAR}-${String(ANCHOR_MONTH).padStart(2, '0')}`;
  const sumCategory = (cat: string) =>
    transactions
      .filter((t) => t.accountId !== 'acc_partner_checking' && t.date.startsWith(currentMonthPrefix) && t.category === cat && t.amountCents < 0)
      .reduce((acc, t) => acc + Math.abs(t.amountCents), 0);

  const budgets: Budget[] = [
    {
      id: 'bdg_groceries',
      name: 'Monthly Groceries',
      category: 'Groceries',
      limitCents: 65000,
      spentCents: sumCategory('Groceries'),
      period: currentMonthPrefix,
    },
    {
      id: 'bdg_dining',
      name: 'Dining & Coffee',
      category: 'Dining & Coffee',
      limitCents: 35000,
      spentCents: sumCategory('Dining & Coffee'),
      period: currentMonthPrefix,
    },
    {
      id: 'bdg_cloud',
      name: 'Software & Cloud Tools',
      category: 'Software & Cloud',
      limitCents: 15000,
      spentCents: sumCategory('Software & Cloud'),
      period: currentMonthPrefix,
    },
  ];

  const goals: Goal[] = [
    {
      id: 'gol_tax',
      name: 'Q4 Estimated Tax Reserve',
      targetCents: 1500000,
      currentCents: 1120000,
      targetDate: '2027-01-15',
    },
    {
      id: 'gol_emergency',
      name: '6-Month Emergency Buffer',
      targetCents: 3000000,
      currentCents: profile.savingsBase,
      targetDate: '2027-06-01',
    },
  ];

  const statements: StatementDocument[] = [
    {
      id: 'stmt_oct_checking',
      title: 'Summit National Checking Statement — Oct 2026',
      accountId: 'acc_checking',
      period: currentMonthPrefix,
      filename: `summit_checking_${currentMonthPrefix}.pdf`,
      extractedText: [
        `SUMMIT NATIONAL BANK (SYNTHETIC STATEMENT)`,
        `Account Holder: ${profile.name}`,
        `Statement Period: 2026-10-01 to 2026-10-28`,
        `Opening Balance: $${(profile.checkingBase / 100).toFixed(2)}`,
        `Routing / Canary Reference: ${canaries.canaryAccountNumber}`,
        `Direct Deposit Verified: ${profile.incomeLabel} +$${(profile.incomeCents / 100).toFixed(2)}`,
        `Recurring Housing: ${profile.rentLabel} -$${(Math.abs(profile.rentCents) / 100).toFixed(2)}`,
      ].join('\n'),
    },
  ];

  const pendingCsvImport = [
    'date,merchant,amount,category,note',
    `2026-10-24,NORTHERN ROASTERS,-14.50,Dining & Coffee,Morning espresso`,
    `2026-10-25,CLOUDSTORAGE.IO,-49.00,Software & Cloud,Additional archive block`,
  ].join('\n');

  const pendingSyncBatch: MockSyncTransaction[] = [
    {
      externalId: `sf_${seed}_01`,
      provider: 'simplefin',
      accountId: 'acc_checking',
      merchantName: 'METRO TRANSIT PASS',
      amountCents: -4500,
      date: '2026-10-26',
      category: 'Transportation',
      memo: 'SimpleFIN automatic rail reload',
    },
    {
      externalId: `lf_${seed}_02`,
      provider: 'lunchflow',
      accountId: 'acc_credit',
      merchantName: 'GREENLEAF MARKET',
      amountCents: -8420,
      date: '2026-10-27',
      category: 'Groceries',
      memo: 'Lunchflow weekend market sync',
    },
  ];

  return {
    seed,
    persona,
    months,
    anchorDate: '2026-10-28',
    activeMemberId: primaryMemberId,
    personaName: profile.name,
    personaEmail: profile.email,
    canaries,
    accounts,
    merchants,
    transactions,
    budgets,
    goals,
    statements,
    familyMembers,
    pendingCsvImport,
    pendingSyncBatch,
  };
}
