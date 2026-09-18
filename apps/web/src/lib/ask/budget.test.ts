import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { monthOf, openBudget, parseBudgetState, sharedBudget, type BudgetEvent } from './budget';

const TOKENS = { input: 150, output: 350, cacheRead: 10_400, cacheWrite: 0 };

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cv-ask-budget-'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const at = (iso: string) => () => new Date(iso);

describe('openBudget', () => {
  it('starts the month at zero and proves it can write', async () => {
    const path = join(dir, 'budget.json');
    const budget = await openBudget({ path, limitUsd: 10, now: at('2026-09-17T10:00:00Z') });

    expect(budget.state()).toMatchObject({ month: '2026-09', requests: 0, costUsd: 0 });
    expect(budget.persistent()).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ month: '2026-09' });
  });

  it('keeps the month across a restart', async () => {
    const path = join(dir, 'budget.json');
    const now = at('2026-09-17T10:00:00Z');

    const before = await openBudget({ path, limitUsd: 10, now });
    await before.record(TOKENS, 0.0147);
    await before.record(TOKENS, 0.0147);

    const after = await openBudget({ path, limitUsd: 10, now });
    expect(after.state()).toMatchObject({ requests: 2, tokens: { cacheRead: 20_800 } });
    expect(after.state().costUsd).toBeCloseTo(0.0294);
  });

  it('ignores last month when it restarts into a new one', async () => {
    const path = join(dir, 'budget.json');
    const august = await openBudget({ path, limitUsd: 10, now: at('2026-08-31T23:00:00Z') });
    await august.record(TOKENS, 9);

    const september = await openBudget({ path, limitUsd: 10, now: at('2026-09-01T00:30:00Z') });
    expect(september.state()).toMatchObject({ month: '2026-09', costUsd: 0 });
  });

  it('rolls over while running when the month changes underneath it', async () => {
    let now = new Date('2026-09-30T23:59:00Z');
    const budget = await openBudget({
      path: join(dir, 'budget.json'),
      limitUsd: 1,
      now: () => now,
    });
    await budget.record(TOKENS, 1);
    expect(budget.exhausted()).toBe(true);

    now = new Date('2026-10-01T00:01:00Z');
    expect(budget.exhausted()).toBe(false);
    expect(budget.state().month).toBe('2026-10');
  });

  it('is exhausted exactly at the limit and reports how much is used', async () => {
    const budget = await openBudget({ path: join(dir, 'budget.json'), limitUsd: 10 });
    await budget.record(TOKENS, 7.5);

    expect(budget.usedRatio()).toBeCloseTo(0.75);
    expect(budget.exhausted()).toBe(false);

    await budget.record(TOKENS, 2.5);
    expect(budget.exhausted()).toBe(true);
  });

  it('starts over from an unreadable file, says so, and repairs it', async () => {
    const path = join(dir, 'budget.json');
    writeFileSync(path, '{ not json');
    const events: BudgetEvent[] = [];

    const budget = await openBudget({ path, limitUsd: 10, onEvent: (event) => events.push(event) });

    expect(events).toEqual([{ kind: 'unreadable', path, error: 'invalid budget file' }]);
    expect(budget.state().costUsd).toBe(0);
    expect(parseBudgetState(readFileSync(path, 'utf8'))).not.toBeNull();
  });

  it('keeps counting in memory when it cannot write, and says so once', async () => {
    const blocker = join(dir, 'a-file');
    writeFileSync(blocker, '');
    const path = join(blocker, 'budget.json');
    const events: BudgetEvent[] = [];

    const budget = await openBudget({ path, limitUsd: 1, onEvent: (event) => events.push(event) });
    await budget.record(TOKENS, 0.6);
    await budget.record(TOKENS, 0.6);

    expect(budget.persistent()).toBe(false);
    expect(budget.exhausted()).toBe(true);
    expect(events.filter((event) => event.kind === 'unpersisted')).toHaveLength(1);
    expect(events.filter((event) => event.kind === 'unreadable')).toHaveLength(1);
  });
});

describe('parseBudgetState', () => {
  it.each([
    ['not an object', '42'],
    ['missing tokens', '{"month":"2026-09","requests":1,"costUsd":1}'],
    ['non-numeric tokens', '{"month":"2026-09","requests":1,"costUsd":1,"tokens":{"input":"1"}}'],
    ['infinite cost', '{"month":"2026-09","requests":1,"costUsd":1e999,"tokens":{}}'],
  ])('rejects %s', (_, raw) => {
    expect(parseBudgetState(raw)).toBeNull();
  });
});

describe('monthOf', () => {
  it('uses the UTC month', () => {
    expect(monthOf(new Date('2026-09-30T23:30:00-02:00'))).toBe('2026-10');
  });
});

describe('sharedBudget', () => {
  it('opens one budget per file and logs when it cannot persist', async () => {
    const writes = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const blocker = join(dir, 'a-file');
    writeFileSync(blocker, '');
    const config = { budgetPath: join(blocker, 'budget.json'), budgetLimitUsd: 10 };

    const first = await sharedBudget(config);
    expect(await sharedBudget(config)).toBe(first);

    const lines = writes.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(lines).toContainEqual(
      expect.objectContaining({ level: 'warn', event: 'ask.budget_unpersisted' })
    );
  });
});
