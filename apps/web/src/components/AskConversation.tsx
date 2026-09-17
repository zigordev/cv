'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from 'design-system/components/core/Button.jsx';
import { Icon } from 'design-system/components/icons/Icon.jsx';

import { useI18n } from '@/i18n/client';
import type { AskSource, Refusal } from '@/lib/ask/contract';
import { useReducedMotion, type Ask, type Availability, type Exchange } from '@/lib/ask/use-ask';
import { mono } from '@/lib/type';

const THINKING_STAGES = ['ask.sending', 'ask.thinking.finding', 'ask.thinking.writing'] as const;
const THINKING_STAGE_MS = 1800;

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

export const prose: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--ds-text-base)',
  lineHeight: 1.65,
  color: 'var(--ds-color-fg)',
};

export const muted: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--ds-text-sm)',
  lineHeight: 1.6,
  color: 'var(--ds-color-fg-muted)',
};

export function AskConversation({
  ask,
  onSource,
  onContact,
  showSuggestions = true,
}: Readonly<{
  ask: Ask;
  onSource: (source: AskSource) => void;
  onContact: () => void;
  showSuggestions?: boolean;
}>) {
  const { t } = useI18n();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.firstElementChild?.scrollIntoView({ block: 'nearest' });
  }, [ask.exchanges]);

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-5)' }}>
      {showSuggestions && ask.exchanges.length === 0 && ask.suggestions.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--ds-space-3)' }}>
          <span style={mono(11, '0.14em')}>{t('ask.try')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ds-space-2)' }}>
            {ask.suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                type="button"
                disabled={!ask.accepting}
                onClick={() => void ask.ask(suggestion)}
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
        aria-busy={ask.pending}
        style={{ display: 'grid', gap: 'var(--ds-space-5)' }}
      >
        {[...ask.exchanges].reverse().map((exchange) => (
          <ExchangeView
            key={exchange.id}
            exchange={exchange}
            onSource={onSource}
            onContact={onContact}
          />
        ))}
      </div>

      {ask.availability === 'open' ? null : (
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
          <p style={muted}>{t(AVAILABILITY_KEYS[ask.availability])}</p>
          <Button variant="secondary" size="sm" type="button" onClick={onContact}>
            {t('ask.contact')}
          </Button>
        </div>
      )}

      {ask.failed ? (
        <p role="alert" style={{ ...muted, color: 'var(--ds-color-danger)' }}>
          {t('ask.error')}
        </p>
      ) : null}
    </div>
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

      {exchange.state === 'pending' ? <Thinking /> : null}

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

function Thinking() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(
      () => setStage((current) => (current + 1) % THINKING_STAGES.length),
      THINKING_STAGE_MS
    );
    return () => clearInterval(timer);
  }, [reduced]);

  const label = t(THINKING_STAGES[reduced ? 0 : stage]);

  return (
    <div className="cv-ask-thinking">
      <span className="cv-sr-only">{t('ask.sending')}</span>
      <span className="cv-ask-thinking-label" aria-hidden="true">
        <Icon name="wand-sparkles" size={13} />
        <span key={label} className="cv-ask-thinking-text">
          {label}
        </span>
      </span>
      <div className="cv-ask-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
