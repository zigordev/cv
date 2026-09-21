import { apiKeyPresent } from '@/lib/ask/config';
import { connectRemoteFlags, isEnabled, registerFlags } from '@/observability';
import { recordFlagState } from '@/observability/app-metrics';
import { reportComponent } from '@/observability/health';
import { writeLogRecord } from '@/observability/json-logger';
import { recordFlagEvaluation } from '@/observability/spans';

export const ASK_FLAG = 'cv-ask';

registerFlags([
  {
    key: 'cv-pdf-download',
    description: 'Shows the Download CV button in the site header.',
    defaultValue: true,
    removeBy: '2026-12-31',
  },
  {
    key: ASK_FLAG,
    description: 'Shows the question box in the site header and enables POST /api/ask.',
    defaultValue: false,
    removeBy: '2027-03-31',
  },
]);

let connection: Promise<boolean> | undefined;

function connect(): Promise<boolean> {
  const url = process.env.UNLEASH_URL;
  const token = process.env.UNLEASH_TOKEN;

  if (!url || !token) {
    return Promise.resolve(false);
  }

  connection ??= connectRemoteFlags({
    url,
    token,
    appName: process.env.UNLEASH_APP_NAME ?? 'cv-web',
    onEvent: (event) => {
      if (event.kind === 'unavailable') {
        reportComponent('unleash', 'down');
        writeLogRecord('warn', { event: 'flags.unavailable', error: event.error });
        return;
      }
      reportComponent('unleash', 'up');
      writeLogRecord('info', { event: `flags.${event.kind}` });
    },
    ...(process.env.UNLEASH_BACKUP_PATH ? { backupPath: process.env.UNLEASH_BACKUP_PATH } : {}),
  });

  void connection.then((ready) => reportComponent('unleash', ready ? 'up' : 'down'));
  return connection;
}

export async function pdfDownloadEnabled(): Promise<boolean> {
  await connect();
  return evaluate('cv-pdf-download', isEnabled('cv-pdf-download'));
}

export async function askEnabled(): Promise<boolean> {
  await connect();
  return evaluate(ASK_FLAG, isEnabled(ASK_FLAG) && apiKeyPresent());
}

function evaluate(key: string, enabled: boolean): boolean {
  recordFlagEvaluation(key, enabled);
  recordFlagState(key, enabled);
  return enabled;
}
