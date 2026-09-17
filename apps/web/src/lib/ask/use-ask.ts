'use client';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useI18n } from '@/i18n/client';
import type { Messages } from '@/i18n/translator';
import { ASK_ENDPOINT, type AskAnswer, type AskSource } from '@/lib/ask/contract';
import { openCaseStudy } from '@/lib/case-study';
import { trackEvent } from '@/observability';

export type Exchange =
  | { readonly id: number; readonly question: string; readonly state: 'pending' }
  | {
      readonly id: number;
      readonly question: string;
      readonly state: 'done';
      readonly answer: AskAnswer;
    };

export type Availability = 'open' | 'resting' | 'limited' | 'unavailable';

const PROBLEM_AVAILABILITY: Record<string, Exclude<Availability, 'open'>> = {
  'ASK.BUDGET_EXHAUSTED': 'resting',
  'ASK.RATE_LIMITED': 'limited',
  'ASK.DISABLED': 'unavailable',
};

export function suggestionsFrom(messages: Messages): string[] {
  const ask = messages.ask;
  if (!ask || typeof ask !== 'object' || Array.isArray(ask)) return [];
  const list = ask.suggestions;
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
}

async function problemCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { code?: unknown };
    return typeof body.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.(REDUCED_MOTION).matches ?? false;
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = globalThis.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

export interface Ask {
  readonly question: string;
  readonly setQuestion: (value: string) => void;
  readonly exchanges: readonly Exchange[];
  readonly availability: Availability;
  readonly failed: boolean;
  readonly pending: boolean;
  readonly accepting: boolean;
  readonly suggestions: readonly string[];
  readonly ask: (text: string) => Promise<void>;
  readonly follow: (source: AskSource) => void;
}

export function useAsk(): Ask {
  const { locale, messages } = useI18n();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [availability, setAvailability] = useState<Availability>('open');
  const [failed, setFailed] = useState(false);
  const nextId = useRef(0);

  const pending = exchanges.some((exchange) => exchange.state === 'pending');
  const accepting = availability === 'open' && !pending;
  const suggestions = useMemo(() => suggestionsFrom(messages), [messages]);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !accepting) return;

      const id = nextId.current;
      nextId.current += 1;
      setFailed(false);
      setQuestion('');
      setExchanges((current) => [...current, { id, question: trimmed, state: 'pending' }]);
      trackEvent('ask-submitted');

      const withdraw = () => {
        setExchanges((current) => current.filter((exchange) => exchange.id !== id));
        setQuestion(trimmed);
      };

      try {
        const response = await fetch(ASK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmed, locale }),
        });

        if (response.ok) {
          const answer = (await response.json()) as AskAnswer;
          setExchanges((current) =>
            current.map((exchange) =>
              exchange.id === id ? { id, question: trimmed, state: 'done', answer } : exchange
            )
          );
          return;
        }

        withdraw();
        const next = PROBLEM_AVAILABILITY[(await problemCode(response)) ?? ''];
        if (next) setAvailability(next);
        else setFailed(true);
      } catch {
        withdraw();
        setFailed(true);
      }
    },
    [accepting, locale]
  );

  const follow = useCallback((source: AskSource) => {
    requestAnimationFrame(() => {
      const { target } = source;
      const sectionId = target.type === 'project' ? 'projects' : target.id;
      const behavior = target.type === 'project' || prefersReducedMotion() ? 'auto' : 'smooth';
      document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
      if (target.type === 'project') openCaseStudy({ id: target.id, tab: target.tab });
    });
  }, []);

  return {
    question,
    setQuestion,
    exchanges,
    availability,
    failed,
    pending,
    accepting,
    suggestions,
    ask,
    follow,
  };
}
