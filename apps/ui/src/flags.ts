import { connectRemoteFlags, isEnabled, registerFlags } from '@/observability';

registerFlags([
  {
    key: 'cv-pdf-download',
    description: 'Shows the Download CV button in the site header.',
    defaultValue: true,
    removeBy: '2026-12-31',
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
    ...(process.env.UNLEASH_BACKUP_PATH ? { backupPath: process.env.UNLEASH_BACKUP_PATH } : {}),
  });

  return connection;
}

export async function pdfDownloadEnabled(): Promise<boolean> {
  await connect();
  return isEnabled('cv-pdf-download');
}
