export const TRADE_STAGES = [
  { key: 'funding', label: 'Funding' },
  { key: 'investment_confirmed', label: 'Investment Confirmed' },
  { key: 'cargo_loaded', label: 'Cargo Loaded' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'custom_clearance', label: 'Custom Clearance' },
  { key: 'settled', label: 'Settled' },
] as const;

export const TRADE_STAGE_COLOR_TOKENS = {
  funding: 'stageFunding',
  investment_confirmed: 'stageInvestmentConfirmed',
  cargo_loaded: 'stageCargoLoaded',
  in_transit: 'stageInTransit',
  custom_clearance: 'stageCustomClearance',
  settled: 'stageSettled',
} as const;

export type TradeStageKey = typeof TRADE_STAGES[number]['key'];
export type TradeStageStatus = 'completed' | 'in_progress' | 'not_started' | 'unknown';

export type TradeStageRecord = {
  stage?: unknown;
  status?: unknown;
  description?: unknown;
  occurred_at?: unknown;
  created_at?: unknown;
};

export type TradeStageEntry = {
  status: TradeStageStatus;
  statusLabel: string;
  description: string;
  occurredAt: string;
  source: 'stage_update' | 'project_status' | 'current_project_stage';
};

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function token(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stageKey(value: unknown): TradeStageKey | null {
  const normalized = token(value);
  const canonical = normalized === 'customs' || normalized === 'customs_clearance'
    ? 'custom_clearance'
    : normalized;

  return TRADE_STAGES.some(stage => stage.key === canonical)
    ? canonical as TradeStageKey
    : null;
}

function projectStageKey(value: unknown): TradeStageKey | null {
  const normalized = token(value);
  const legacyStages: Record<string, TradeStageKey> = {
    active: 'investment_confirmed',
    ready_to_ship: 'investment_confirmed',
    shipping: 'in_transit',
    completed: 'settled',
    complete: 'settled',
    done: 'settled',
  };
  return stageKey(normalized) ?? legacyStages[normalized] ?? null;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function statusInfo(value: unknown, stage: TradeStageKey): Pick<TradeStageEntry, 'status' | 'statusLabel'> {
  const normalized = token(value);
  if (['completed', 'complete', 'done'].includes(normalized) || (stage === 'settled' && normalized === 'settled')) {
    return { status: 'completed', statusLabel: 'Completed' };
  }
  if (['in_progress', 'inprogress', 'active', 'processing'].includes(normalized)) {
    return { status: 'in_progress', statusLabel: 'In progress' };
  }
  if (['not_started', 'notstarted', 'pending', 'awaiting'].includes(normalized)) {
    return { status: 'not_started', statusLabel: 'Not started' };
  }

  return {
    status: 'unknown',
    statusLabel: titleCase(text(value)) || 'Update recorded',
  };
}

export function resolveTradeProgress(stageUpdates: TradeStageRecord[], projectStatus = '', currentStage = ''): {
  latestByStage: Map<TradeStageKey, TradeStageEntry>;
  completedCount: number;
} {
  const latestByStage = new Map<TradeStageKey, TradeStageEntry>();
  const orderedUpdates = stageUpdates
    .map((update, index) => ({
      update,
      index,
      createdAt: Date.parse(text(update.created_at)),
    }))
    .sort((left, right) => {
      if (Number.isFinite(left.createdAt) && Number.isFinite(right.createdAt) && left.createdAt !== right.createdAt) {
        return left.createdAt - right.createdAt;
      }
      return left.index - right.index;
    });

  for (const { update } of orderedUpdates) {
    const stage = stageKey(update.stage);
    if (!stage) continue;

    latestByStage.set(stage, {
      ...statusInfo(update.status, stage),
      description: text(update.description),
      occurredAt: text(update.occurred_at),
      source: 'stage_update',
    });
  }

  // Match the admin progress rail: the reported project/current stage means
  // earlier milestones are complete, this stage is active, and later stages
  // stay unreported. Settled completes the full sequence. Explicit per-stage
  // records always win, and inferred milestones never gain event details.
  const statusStage = projectStageKey(projectStatus);
  const currentStageKey = stageKey(currentStage);
  const reportedStage = statusStage === 'settled'
    ? statusStage
    : [statusStage, currentStageKey]
      .filter((stage): stage is TradeStageKey => Boolean(stage))
      .sort((left, right) =>
        TRADE_STAGES.findIndex(stage => stage.key === right)
        - TRADE_STAGES.findIndex(stage => stage.key === left)
      )[0];
  if (reportedStage) {
    const currentIndex = TRADE_STAGES.findIndex(stage => stage.key === reportedStage);
    const source = statusStage === 'settled' ? 'project_status' : 'current_project_stage';
    TRADE_STAGES.forEach((stage, index) => {
      if (latestByStage.has(stage.key)) return;
      if (index < currentIndex || reportedStage === 'settled') {
        latestByStage.set(stage.key, {
          status: 'completed',
          statusLabel: 'Completed',
          description: '',
          occurredAt: '',
          source,
        });
      } else if (index === currentIndex) {
        latestByStage.set(stage.key, {
          status: 'in_progress',
          statusLabel: 'Current milestone',
          description: '',
          occurredAt: '',
          source,
        });
      }
    });
  }

  const completedCount = TRADE_STAGES.filter(stage => latestByStage.get(stage.key)?.status === 'completed').length;
  return { latestByStage, completedCount };
}
