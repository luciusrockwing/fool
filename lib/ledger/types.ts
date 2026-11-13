export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';

export type PersonaType = 'freelancer' | 'family' | 'executive' | 'student';

export interface Account {
  id: string;
  name: string;
  nickname: string;
  type: AccountType;
  institution: string;
  accountNumberMasked: string;
  balanceCents: number;
  currency: 'USD';
  ownerMemberId: string;
  notes: string;
}

export interface Merchant {
  id: string;
  name: string;
  descriptor: string;
  category: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  merchantId: string;
  merchantName: string;
  amountCents: number;
  date: string;
  category: string;
  note: string;
  tags: string[];
  pending: boolean;
  source: 'seeded' | 'manual' | 'csv_import' | 'sync_feed';
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  limitCents: number;
  spentCents: number;
  period: string;
}

export interface Goal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string;
}

export interface StatementDocument {
  id: string;
  title: string;
  accountId: string;
  period: string;
  filename: string;
  extractedText: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'primary' | 'partner' | 'dependent';
  email: string;
  privateNote: string;
}

export interface CanarySet {
  canaryAccountNumber: string;
  canaryApiKey: string;
  canarySsnSynthetic: string;
  canaryRecoveryPhrase: string;
  canaryIban: string;
}

export interface MockSyncTransaction {
  externalId: string;
  provider: 'simplefin' | 'lunchflow';
  accountId: string;
  merchantName: string;
  amountCents: number;
  date: string;
  category: string;
  memo: string;
}

export interface WorldState {
  seed: number;
  persona: PersonaType;
  months: number;
  anchorDate: string;
  activeMemberId: string;
  personaName: string;
  personaEmail: string;
  canaries: CanarySet;
  accounts: Account[];
  merchants: Merchant[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  statements: StatementDocument[];
  familyMembers: FamilyMember[];
  pendingCsvImport: string;
  pendingSyncBatch: MockSyncTransaction[];
}

export interface LedgerDiff {
  addedTransactions: Transaction[];
  modifiedTransactions: Array<{ before: Transaction; after: Transaction }>;
  deletedTransactionIds: string[];
  modifiedAccounts: Array<{ id: string; name: string; balanceBeforeCents: number; balanceAfterCents: number }>;
  addedTags: Array<{ transactionId: string; tag: string }>;
}
