'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from 'design-system/components/core/Button.jsx';
import { Icon } from 'design-system/components/icons/Icon.jsx';

import { AskConversation } from '@/components/AskConversation';
import { useI18n } from '@/i18n/client';
import type { AskSource } from '@/lib/ask/contract';
import { useReducedMotion, type Ask } from '@/lib/ask/use-ask';
import { mono } from '@/lib/type';
import { trackEvent } from '@/observability';

const MAX_QUESTION_CHARS = 500;
const TYPE_MS = 34;
const HOLD_MS = 2800;
const DELETE_MS = 16;
const GAP_MS = 600;

type Typing = { index: number; length: number; phase: 'typing' | 'deleting' };

function useTypewriter(lines: readonly string[], active: boolean): string | null {
  const reduced = useReducedMotion();
  const enabled = active && lines.length > 0 && !reduced;
  const [state, setState] = useState<Typing>({ index: 0, length: 0, phase: 'typing' });

  useEffect(() => {
    if (!enabled) return undefined;
    const line = lines[state.index % lines.length] ?? '';
    let delay = TYPE_MS;
    let next: Typing = state;

    if (state.phase === 'typing') {
      if (state.length < line.length) next = { ...state, length: state.length + 1 };
      else {
        delay = HOLD_MS;
        next = { ...state, phase: 'deleting' };
      }
    } else if (state.length > 0) {
      delay = DELETE_MS;
      next = { ...state, length: state.length - 1 };
    } else {
      delay = GAP_MS;
      next = { index: (state.index + 1) % lines.length, length: 0, phase: 'typing' };
    }

    const timer = setTimeout(() => setState(next), delay);
    return () => clearTimeout(timer);
  }, [enabled, state, lines]);

  if (!enabled) return null;
  return (lines[state.index % lines.length] ?? '').slice(0, state.length);
}

export function AskBar({ ask, onContact }: Readonly<{ ask: Ask; onContact: () => void }>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const listing = ask.exchanges.length === 0 && ask.availability === 'open' && !ask.failed;
  const ghost = useTypewriter(ask.suggestions, !focused && ask.question === '');

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const show = () => {
    if (open) return;
    setOpen(true);
    trackEvent('ask-opened');
  };

  const submit = (text: string) => {
    if (!text.trim() || !ask.accepting) return;
    setActive(-1);
    setOpen(true);
    void ask.ask(text);
  };

  const follow = (source: AskSource) => {
    setOpen(false);
    ask.follow(source);
  };

  const contact = () => {
    setOpen(false);
    onContact();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const count = ask.suggestions.length;
    if (event.key === 'ArrowDown' && listing && count > 0) {
      event.preventDefault();
      show();
      setActive((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp' && listing && count > 0) {
      event.preventDefault();
      show();
      setActive((index) => (index - 1 + count) % count);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (listing && active >= 0) submit(ask.suggestions[active]);
      else submit(ask.question);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="cv-ask-bar cv-no-print"
      data-open={open}
      data-pending={ask.pending}
    >
      <div className="cv-ask-pill">
        <Icon
          name="wand-sparkles"
          size={16}
          style={{ color: 'var(--ds-color-accent)', flexShrink: 0 }}
        />
        <input
          id="cv-ask-bar-input"
          className="cv-ask-input"
          type="text"
          role="combobox"
          aria-label={t('ask.label')}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-haspopup={listing ? 'listbox' : 'dialog'}
          aria-autocomplete={listing ? 'list' : undefined}
          aria-activedescendant={open && listing && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={ghost === null ? t('ask.bar.placeholder') : ''}
          value={ask.question}
          disabled={ask.availability !== 'open'}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            ask.setQuestion(event.target.value);
            show();
          }}
          onFocus={() => {
            setFocused(true);
            show();
          }}
          onClick={show}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        {ghost !== null ? (
          <span className="cv-ask-ghost" aria-hidden="true">
            {ghost}
            <span className="cv-ask-caret" />
          </span>
        ) : null}
        <button
          type="button"
          className="cv-ask-go"
          aria-label={t('ask.submit')}
          data-pending={ask.pending}
          disabled={!ask.accepting || !ask.question.trim()}
          onClick={() => submit(ask.question)}
        >
          <Icon name={ask.pending ? 'loader-circle' : 'arrow-up'} size={14} />
        </button>
      </div>

      {open && listing ? (
        <div className="cv-ask-panel">
          <ul id={panelId} role="listbox" aria-label={t('ask.try')} className="cv-ask-listbox">
            {ask.suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className="cv-ask-option"
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
                onClick={() => submit(suggestion)}
              >
                <Icon name="wand-sparkles" size={13} style={{ flexShrink: 0 }} />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
          <p className="cv-ask-hint">{t('ask.bar.hint')}</p>
        </div>
      ) : null}

      {open && !listing ? (
        <div id={panelId} role="dialog" aria-label={t('ask.title')} className="cv-ask-panel">
          <div className="cv-ask-panel-head">
            <span style={mono(11, '0.14em')}>{t('ask.title')}</span>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={t('modal.close')}
              onClick={() => setOpen(false)}
            >
              <Icon name="x" size={14} />
            </Button>
          </div>
          <AskConversation
            ask={ask}
            onSource={follow}
            onContact={contact}
            showSuggestions={ask.exchanges.length === 0}
          />
          <p className="cv-ask-hint">{t('ask.bar.hint')}</p>
        </div>
      ) : null}
    </div>
  );
}
