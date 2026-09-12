'use client';

import { useMemo } from 'react';

import { useI18n } from '@/i18n/client';
import { resolveCv, type Cv } from '@/content/cv';

/** The CV in the currently selected language, from the server-resolved bundle. */
export function useCv(): Cv {
  const { messages } = useI18n();
  return useMemo(() => resolveCv(messages), [messages]);
}
