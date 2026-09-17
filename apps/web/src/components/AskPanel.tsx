'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from 'design-system/components/core/Button.jsx';
import { Field } from 'design-system/components/forms/Field.jsx';
import { Textarea } from 'design-system/components/forms/Textarea.jsx';
import { Modal } from 'design-system/components/overlay/Modal.jsx';

import { useI18n } from '@/i18n/client';
import type { Messages } from '@/i18n/translator';
import { ASK_ENDPOINT, type AskAnswer, type AskSource, type Refusal } from '@/lib/ask/contract';
import { openCaseStudy } from '@/lib/case-study';
import { mono } from '@/lib/type';
import { trackEvent } from '@/observability';

const MAX_QUESTION_CHARS = 500;

type Exchange =
  | { readonly id: number; readonly question: string; readonly state: 'pending' }
  | {
      readonly id: number;
      readonly question: string;
      readonly state: 'done';
      readonly answer: AskAnswer;
    };

type Availability = 'open' | 'resting' | 'limited' | 'unavailable';

const REFUSAL_KEYS: Record<Refusal, string> = {
  not_in_cv: 'ask.refusals.notInCv',
  contact: 'ask.refusals.contact',
  speculation: 'ask.refusals.speculation',
  off_topic: 'ask.refusals.offTopic',
};

const AVAILABILITY_KEYS: Record<Exclude<Availability, 'open'>, string> = {
  resting: 'ask.resting',
  limited: 'ask.rateLimited',
  unavailable: 'ask.unavailable',
};

const PROBLEM_AVAILABILITY: Record<string, Exclude<Availability, 'open'>> = {
  'ASK.BUDGET_EXHAUSTED': 'resting',
  'ASK.RATE_LIMITED': 'limited',
  'ASK.DISABLED': 'unavailable',
};

function suggestionsFrom(messages: Messages): string[] {
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

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const prose: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--ds-text-base)',
  lineHeight: 1.65,
  color: 'var(--ds-color-fg)',
};

const muted: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--ds-text-sm)',
  lineHeight: 1.6,
  color: 'var(--ds-color-fg-muted)',
};

export function AskPanel({
  open,
  onClose,
  onContact,
}: Readonly<{ open: boolean; onClose: () => void; onContact: () => void }>) {
  const { t, locale, messages } = useI18n();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [availability, setAvailability] = useState<Availability>('open');
  const [failed, setFailed] = useState(false);
  const nextId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const pending = exchanges.some((exchange) => exchange.state === 'pending');
  const accepting = availability === 'open' && !pending;
  const suggestions = suggestionsFrom(messages);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [exchanges]);

  async function ask(text: string) {
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
  }

  function follow(source: AskSource) {
    onClose();
    requestAnimationFrame(() => {
      const { target } = source;
      const sectionId = target.type === 'project' ? 'projects' : target.id;
      const behavior = target.type === 'project' || prefersReducedMotion() ? 'auto' : 'smooth';
      document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
      if (target.type === 'project') openCaseStudy({ id: target.id, tab: target.tab });
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('ask.title')}
      description={t('ask.intro')}
      closeLabel={t('modal.close')}
    >
      <div className="cv-no-print" style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        {exchanges.length === 0 && suggestions.length > 0 ? (
          <div style={{ display: 'grid', gap: 'var(--ds-space-3)' }}>
            <span style={mono(11, '0.14em')}>{t('ask.try')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-2)' }}>
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={!accepting}
                  onClick={() => void ask(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          ref={logRef}
          aria-live="polite"
          aria-busy={pending}
          style={{ display: 'grid', gap: 'var(--ds-space-5)' }}
        >
          {exchanges.map((exchange) => (
            <ExchangeView
              key={exchange.id}
              exchange={exchange}
              onSource={follow}
              onContact={onContact}
            />
          ))}
        </div>

        {availability === 'open' ? null : (
          <div
            role="status"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--ds-space-3)',
            }}
          >
            <p style={muted}>{t(AVAILABILITY_KEYS[availability])}</p>
            <Button variant="secondary" size="sm" type="button" onClick={onContact}>
              {t('ask.contact')}
            </Button>
          </div>
        )}

        {failed ? (
          <p role="alert" style={{ ...muted, color: 'var(--ds-color-danger)' }}>
            {t('ask.error')}
          </p>
        ) : null}

        <form
          noValidate
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            void ask(question);
          }}
          style={{ display: 'grid', gap: 'var(--ds-space-3)' }}
        >
          <Field label={t('ask.label')} hint={t('ask.hint')} htmlFor="cv-ask-question">
            <Textarea
              id="cv-ask-question"
              name="question"
              rows={3}
              maxLength={MAX_QUESTION_CHARS}
              value={question}
              placeholder={t('ask.placeholder')}
              disabled={availability !== 'open'}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setQuestion(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void ask(question);
                }
              }}
            />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={pending}
              disabled={!accepting || !question.trim()}
            >
              {pending ? t('ask.sending') : t('ask.submit')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ExchangeView({
  exchange,
  onSource,
  onContact,
}: Readonly<{
  exchange: Exchange;
  onSource: (source: AskSource) => void;
  onContact: () => void;
}>) {
  const { t } = useI18n();

  return (
    <article
      style={{
        display: 'grid',
        gap: 'var(--ds-space-3)',
        paddingTop: 'var(--ds-space-4)',
        borderTop: '1px solid var(--ds-color-border)',
      }}
    >
      <span style={mono(11, '0.14em')}>{t('ask.you')}</span>
      <p style={{ ...prose, color: 'var(--ds-color-fg-muted)' }}>{exchange.question}</p>

      {exchange.state === 'pending' ? <p style={muted}>{t('ask.sending')}</p> : null}

      {exchange.state === 'done' && exchange.answer.outcome === 'answered' ? (
        <>
          <p style={prose}>{exchange.answer.answer}</p>
          <div style={{ display: 'grid', gap: 'var(--ds-space-2)' }}>
            <span style={mono(11, '0.14em')}>{t('ask.sources')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-2)' }}>
              {exchange.answer.sources.map((source) => (
                <Button
                  key={source.label}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => onSource(source)}
                >
                  {source.label}
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {exchange.state === 'done' && exchange.answer.outcome === 'refused' ? (
        <div style={{ display: 'grid', gap: 'var(--ds-space-3)', justifyItems: 'start' }}>
          <p style={prose}>{t(REFUSAL_KEYS[exchange.answer.refusal])}</p>
          {exchange.answer.refusal === 'contact' || exchange.answer.refusal === 'speculation' ? (
            <Button variant="secondary" size="sm" type="button" onClick={onContact}>
              {t('ask.contact')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
