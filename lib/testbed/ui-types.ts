import type { CanarySet, LedgerDiff, WorldState } from '../ledger/types';
import type {
  DefenseConfig,
  JudgeReport,
  McpTraceEntry,
  PersistedRunSummary,
  SinkCaptureEvent,
} from './episode-store';
import type { ScoreboardMetrics } from './judge';
import type { ScenarioDefinition } from './scenarios';

export interface ScenarioWithYaml extends ScenarioDefinition {
  yaml: string;
}

export interface SerializedEpisode {
  id: string;
  token: string;
  scenarioId: string;
  scenarioTitle: string;
  difficulty: ScenarioDefinition['difficulty'];
  vector: ScenarioDefinition['vector'];
  task: string;
  agentProfile: 'naive' | 'hardened' | 'custom';
  executionMode: 'deterministic' | 'gemini-live';
  modelName: string;
  defenses: DefenseConfig;
  seed: number;
  canaries: CanarySet;
  traces: McpTraceEntry[];
  sinkEvents: SinkCaptureEvent[];
  ledgerDiff: LedgerDiff;
  agentFinalResponse: string;
  judgeReport: JudgeReport;
  createdAt: string;
  completedAt: string;
}

export interface ComparePayload {
  mode: 'compare';
  naive: SerializedEpisode;
  hardened: SerializedEpisode;
  scoreboard: ScoreboardMetrics;
}

export interface SinglePayload {
  mode: 'single';
  episode: SerializedEpisode;
  scoreboard: ScoreboardMetrics;
}

export interface EpisodesIndexPayload {
  geminiAvailable: boolean;
  runs: PersistedRunSummary[];
  scoreboard: ScoreboardMetrics;
}

export interface WorldPreviewPayload {
  world: WorldState;
  appliedScenarioId: string | null;
}
