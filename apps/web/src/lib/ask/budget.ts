import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { AskConfig } from './config';
import { writeLog } from './log';
import { addUsage, EMPTY_USAGE, type TokenUsage } from './pricing';

export interface BudgetState {
  readonly month: string;
  readonly requests: number;
  readonly costUsd: number;
  readonly tokens: TokenUsage;
}

export type BudgetEvent =
  | { readonly kind: 'unreadable'; readonly path: string; readonly error: string }
  | { readonly kind: 'unpersisted'; readonly path: string; readonly error: string };

export interface Budget {
  readonly limitUsd: number;
  state(): BudgetState;
  usedRatio(): number;
  exhausted(): boolean;
  persistent(): boolean;
  record(tokens: TokenUsage, costUsd: number): Promise<void>;
}

export interface BudgetOptions {
  readonly path: string;
  readonly limitUsd: number;
  readonly now?: () => Date;
  readonly onEvent?: (event: BudgetEvent) => void;
}

export function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function freshState(month: string): BudgetState {
  return { month, requests: 0, costUsd: 0, tokens: EMPTY_USAGE };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTokenUsage(value: unknown): value is TokenUsage {
  if (typeof value !== 'object' || value === null) return false;
  const usage = value as Record<string, unknown>;
  return ['input', 'output', 'cacheRead', 'cacheWrite'].every(
    (key) => typeof usage[key] === 'number' && Number.isFinite(usage[key])
  );
}

export function parseBudgetState(raw: string): BudgetState | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value.month === 'string' &&
      typeof value.requests === 'number' &&
      typeof value.costUsd === 'number' &&
      Number.isFinite(value.costUsd) &&
      isTokenUsage(value.tokens)
    ) {
      return {
        month: value.month,
        requests: value.requests,
        costUsd: value.costUsd,
        tokens: value.tokens,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function openBudget(options: BudgetOptions): Promise<Budget> {
  const now = options.now ?? (() => new Date());
  let current = freshState(monthOf(now()));
  let persisted = false;
  let failing = false;
  let writes: Promise<void> = Promise.resolve();

  try {
    const loaded = parseBudgetState(await readFile(options.path, 'utf8'));
    if (loaded === null) {
      options.onEvent?.({ kind: 'unreadable', path: options.path, error: 'invalid budget file' });
    } else if (loaded.month === current.month) {
      current = loaded;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      options.onEvent?.({ kind: 'unreadable', path: options.path, error: errorText(error) });
    }
  }

  const roll = () => {
    const month = monthOf(now());
    if (current.month !== month) current = freshState(month);
  };

  const persist = (): Promise<void> => {
    const snapshot = JSON.stringify(current);
    writes = writes.then(async () => {
      try {
        await mkdir(dirname(options.path), { recursive: true });
        const temporary = `${options.path}.tmp`;
        await writeFile(temporary, snapshot, 'utf8');
        await rename(temporary, options.path);
        persisted = true;
        failing = false;
      } catch (error) {
        persisted = false;
        if (!failing) {
          options.onEvent?.({ kind: 'unpersisted', path: options.path, error: errorText(error) });
        }
        failing = true;
      }
    });
    return writes;
  };

  await persist();

  return {
    limitUsd: options.limitUsd,
    state() {
      roll();
      return current;
    },
    usedRatio() {
      roll();
      return current.costUsd / options.limitUsd;
    },
    exhausted() {
      roll();
      return current.costUsd >= options.limitUsd;
    },
    persistent() {
      return persisted;
    },
    record(tokens: TokenUsage, costUsd: number) {
      roll();
      current = {
        month: current.month,
        requests: current.requests + 1,
        costUsd: current.costUsd + costUsd,
        tokens: addUsage(current.tokens, tokens),
      };
      return persist();
    },
  };
}

const shared = new Map<string, Promise<Budget>>();

export function sharedBudget(
  config: Pick<AskConfig, 'budgetPath' | 'budgetLimitUsd'>
): Promise<Budget> {
  const key = `${config.budgetPath}|${config.budgetLimitUsd}`;
  let budget = shared.get(key);
  if (!budget) {
    budget = openBudget({
      path: config.budgetPath,
      limitUsd: config.budgetLimitUsd,
      onEvent: (event) =>
        writeLog('warn', `ask.budget_${event.kind}`, { path: event.path, error: event.error }),
    });
    shared.set(key, budget);
  }
  return budget;
}
