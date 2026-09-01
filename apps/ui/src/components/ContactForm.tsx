'use client';

import { useState } from 'react';

import { Button } from '@ds/components/core/Button.jsx';
import { Field } from '@ds/components/forms/Field.jsx';
import { Input } from '@ds/components/forms/Input.jsx';
import { Textarea } from '@ds/components/forms/Textarea.jsx';

import { useI18n } from '@/i18n/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const { t, locale } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('form.required');
    if (!email.trim()) next.email = t('form.required');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('form.emailInvalid');
    if (!message.trim()) next.message = t('form.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'sending' || !validate()) return;

    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          locale,
        }),
      });
      if (!response.ok) throw new Error(`Contact request failed: ${response.status}`);
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <p
        role="status"
        style={{
          margin: 0,
          fontSize: 'var(--ds-text-base)',
          lineHeight: 1.6,
          color: 'var(--ds-color-success)',
          maxWidth: '56ch',
        }}
      >
        {t('form.success')}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="cv-no-print"
      style={{ display: 'grid', gap: 'var(--ds-space-4)', maxWidth: 520 }}
    >
      <Field label={t('form.name')} error={errors.name} htmlFor="cv-contact-name" required>
        <Input
          id="cv-contact-name"
          name="name"
          value={name}
          autoComplete="name"
          invalid={Boolean(errors.name)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
      </Field>

      <Field label={t('form.email')} error={errors.email} htmlFor="cv-contact-email" required>
        <Input
          id="cv-contact-email"
          name="email"
          type="email"
          value={email}
          autoComplete="email"
          invalid={Boolean(errors.email)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
      </Field>

      <Field label={t('form.message')} error={errors.message} htmlFor="cv-contact-message" required>
        <Textarea
          id="cv-contact-message"
          name="message"
          value={message}
          rows={5}
          invalid={Boolean(errors.message)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-4)' }}>
        <Button type="submit" variant="primary" size="sm" loading={status === 'sending'}>
          {status === 'sending' ? t('form.sending') : t('form.submit')}
        </Button>
        {status === 'error' ? (
          <span
            role="alert"
            style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-color-danger)' }}
          >
            {t('form.error')}
          </span>
        ) : null}
      </div>
    </form>
  );
}
