import { afterEach, describe, expect, it } from 'vitest';

import { apiKeyPresent, askConfig, DEFAULT_BUDGET_PATH } from './config';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe('askConfig', () => {
  it('defaults to a ten dollar month on Opus 5 at low effort, logging questions but not answers', () => {
    delete process.env.ASK_BUDGET_LIMIT_USD;
    delete process.env.ASK_BUDGET_PATH;
    delete process.env.ASK_LOG_QUESTIONS;
    delete process.env.ASK_LOG_ANSWERS;

    expect(askConfig()).toMatchObject({
      model: 'claude-opus-5',
      effort: 'low',
      budgetLimitUsd: 10,
      budgetPath: DEFAULT_BUDGET_PATH,
      perIpHourly: 6,
      perIpDaily: 15,
      maxQuestionChars: 500,
      logQuestions: true,
      logAnswers: false,
    });
  });

  it('takes the budget, its path and the log switches from the environment', () => {
    process.env.ASK_BUDGET_LIMIT_USD = '4.5';
    process.env.ASK_BUDGET_PATH = ' /data/budget.json ';
    process.env.ASK_LOG_QUESTIONS = '0';
    process.env.ASK_LOG_ANSWERS = 'TRUE';

    expect(askConfig()).toMatchObject({
      budgetLimitUsd: 4.5,
      budgetPath: '/data/budget.json',
      logQuestions: false,
      logAnswers: true,
    });
  });

  it.each(['0', '-3', 'ten', ''])('ignores an unusable budget of %j', (value) => {
    process.env.ASK_BUDGET_LIMIT_USD = value;

    expect(askConfig().budgetLimitUsd).toBe(10);
  });

  it('keeps the default for a log switch it cannot read', () => {
    process.env.ASK_LOG_ANSWERS = 'maybe';

    expect(askConfig().logAnswers).toBe(false);
  });
});

describe('apiKeyPresent', () => {
  it('needs a non-blank key', () => {
    process.env.ANTHROPIC_API_KEY = '   ';
    expect(apiKeyPresent()).toBe(false);

    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(apiKeyPresent()).toBe(true);
  });
});
