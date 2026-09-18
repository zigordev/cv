export interface AskConfig {
  readonly model: string;
  readonly effort: 'low' | 'medium' | 'high';
  readonly maxTokens: number;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly budgetLimitUsd: number;
  readonly budgetPath: string;
  readonly perIpHourly: number;
  readonly perIpDaily: number;
  readonly maxQuestionChars: number;
  readonly maxBodyBytes: number;
  readonly logQuestions: boolean;
  readonly logAnswers: boolean;
}

export const DEFAULT_BUDGET_PATH = '/var/lib/cv/ask-budget.json';

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanSetting(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}

export function askConfig(): AskConfig {
  return {
    model: 'claude-opus-5',
    effort: 'low',
    maxTokens: 2048,
    timeoutMs: 20_000,
    maxRetries: 1,
    budgetLimitUsd: positiveNumber('ASK_BUDGET_LIMIT_USD', 10),
    budgetPath: process.env.ASK_BUDGET_PATH?.trim() || DEFAULT_BUDGET_PATH,
    perIpHourly: 6,
    perIpDaily: 15,
    maxQuestionChars: 500,
    maxBodyBytes: 4096,
    logQuestions: booleanSetting('ASK_LOG_QUESTIONS', true),
    logAnswers: booleanSetting('ASK_LOG_ANSWERS', false),
  };
}

export function apiKeyPresent(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
