'use client';

import { ContactForm } from '@/components/ContactForm';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/i18n/client';
import { mono } from '@/lib/type';

export function Contact() {
  const { t } = useI18n();

  return (
    <Reveal id="contact">
      <div style={{ display: 'grid', gap: 'var(--ds-space-6)' }}>
        <div
          style={{
            display: 'grid',
            gap: 'var(--ds-space-2)',
            paddingBottom: 'var(--ds-space-4)',
            borderBottom: '1px solid var(--ds-color-border-strong)',
          }}
        >
          <span style={mono(11, '0.16em')}>05 — {t('sections.contact.kicker')}</span>
        </div>

        <ContactForm />
      </div>
    </Reveal>
  );
}
