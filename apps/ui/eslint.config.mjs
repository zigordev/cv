import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  // The v8 reporter writes its own bundled JavaScript under coverage/, which
  // eslint would otherwise walk and complain about.
  { ignores: ['coverage/**'] },
  {
    extends: [...nextCoreWebVitals],
  },
]);
