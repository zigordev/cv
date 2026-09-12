function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Tolgee sync`);
  }
  return value;
}

module.exports = {
  apiUrl: requireEnv('TOLGEE_API_URL'),
  apiKey: requireEnv('TOLGEE_API_KEY'),
  projectId: Number(requireEnv('TOLGEE_PROJECT_ID')),
  format: 'JSON_TOLGEE',
  delimiter: null,
  /*
   * Explicit file-to-language mapping, not a template.
   *
   * The app's locales are `en` and `es`, but the Tolgee project tags Spanish
   * as `es-ES`. A `{languageTag}` template derives the tag from the filename,
   * so `messages/es.json` is offered as `es`, no such language exists in the
   * project, and the push fails with "Not able to map files to existing
   * languages in the platform" after having already uploaded the files.
   *
   * `scripts/i18n-pull.mjs` normalises the same mismatch in the other
   * direction, writing `es-ES.json` from the export as `es.json`. Add a locale
   * here whenever one is added to `src/i18n/config.ts`.
   */
  push: {
    files: [
      { path: './messages/en.json', language: 'en' },
      { path: './messages/es.json', language: 'es-ES' },
    ],
  },
};
