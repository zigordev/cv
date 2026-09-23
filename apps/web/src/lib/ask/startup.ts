import { ASK_FLAG, askEnabled } from '@/flags';
import { allFlags } from '@/observability';

import { sharedBudget } from './budget';
import { apiKeyPresent, askConfig } from './config';
import { roundUsd, writeLog } from './log';
import { observeBudgetUsed } from './metrics';

export async function logAskConfiguration(): Promise<void> {
  const config = askConfig();
  const enabled = await askEnabled();
  const flag = allFlags().find((entry) => entry.key === ASK_FLAG);
  const budget = await sharedBudget(config);
  const state = budget.state();
  const keyPresent = apiKeyPresent();

  observeBudgetUsed(budget.usedRatio());

  writeLog('info', 'ask.configured', {
    enabled,
    flag: flag ? { enabled: flag.enabled, source: flag.source } : null,
    apiKeyPresent: keyPresent,
    model: config.model,
    effort: config.effort,
    maxTokens: config.maxTokens,
    budgetLimitUsd: config.budgetLimitUsd,
    budgetPath: config.budgetPath,
    budgetPersistent: budget.persistent(),
    month: state.month,
    monthToDateUsd: roundUsd(state.costUsd),
    monthToDateRequests: state.requests,
    perIpHourly: config.perIpHourly,
    perIpDaily: config.perIpDaily,
    logQuestions: config.logQuestions,
    logAnswers: config.logAnswers,
  });
}
