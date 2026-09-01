'use client';

import { useState } from 'react';

import { Button } from '@ds/components/core/Button.jsx';
import { Flag } from '@ds/components/icons/Flag.jsx';
import { Icon } from '@ds/components/icons/Icon.jsx';
import { Menu, MenuItem } from '@ds/components/overlay/Menu.jsx';
import { Modal } from '@ds/components/overlay/Modal.jsx';

import { ContactForm } from '@/components/ContactForm';
import { useCv } from '@/content/useCv';
import { useI18n } from '@/i18n/client';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '@/i18n/config';
import { display } from '@/lib/type';

/**
 * Fixed header: the name on the left, chrome-level controls on the right.
 *
 * It carries a solid background and a hairline rule, unlike the transparent
 * floating controls it replaced. Once the name lives here the bar has content
 * of its own, and text scrolling underneath a transparent strip would collide
 * with it. The page reserves `--cv-header-height` of top padding so nothing
 * starts underneath, and the rail sticks below it rather than behind it.
 *
 * Contact is a dialog rather than a section: it is an action a reader takes,
 * not a part of the CV they read through, and it was the one section that had
 * nothing to read in it. Reaching it from the fixed bar means it is available
 * from anywhere on the page instead of only from the bottom.
 *
 * The design system has no `download` or `mail` icon, so these reuse the
 * nearest honest matches from the set: an arrow for the download, a pencil for
 * writing a message.
 */
export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { identity, labels } = useCv();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <header
        className="cv-header cv-no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          height: 'var(--cv-header-height)',
          background: 'var(--ds-color-bg)',
          borderBottom: '1px solid var(--ds-color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--ds-space-4)',
            height: '100%',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 48px',
          }}
        >
          <span style={display(26, 1, '-0.01em')}>
            {identity.firstName} {identity.lastName}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-2)' }}>
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setContactOpen(true)}
              aria-haspopup="dialog"
            >
              <Icon name="pencil" size={15} />
              <span className="cv-btn-label">{labels.sections.contact}</span>
            </Button>

            {/* A real download of a build-time PDF, not window.print() — that
                opened a dialog and left the visitor to choose "Save as PDF".

                `md`, not `sm`, to match the globe: the design system sizes icon
                buttons at 38px and has no small variant, so an `sm` (32px)
                neighbour sits 6px short of it. */}
            <Button
              as="a"
              variant="primary"
              size="md"
              href={`/cv-${locale}.pdf`}
              download={`${identity.firstName}-${identity.lastName}-CV-${locale.toUpperCase()}.pdf`}
            >
              <Icon name="arrow-down" size={15} />
              <span className="cv-btn-label">{t('rail.pdf')}</span>
            </Button>

            <Menu
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  aria-label={t('rail.language')}
                  title={t('rail.language')}
                  style={{ lineHeight: 1 }}
                >
                  <Icon name="globe" />
                </Button>
              }
            >
              {({ close }: { close: () => void }) => (
                <>
                  {SUPPORTED_LOCALES.map((code) => (
                    <MenuItem
                      key={code}
                      onClick={() => {
                        close();
                        setLocale(code as Locale);
                      }}
                    >
                      <Flag code={LOCALE_META[code].flagCode} /> {LOCALE_META[code].label}
                    </MenuItem>
                  ))}
                </>
              )}
            </Menu>
          </div>
        </div>
      </header>

      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        size="md"
        title={labels.sections.contact}
        closeLabel={t('modal.close')}
      >
        <ContactForm />
      </Modal>
    </>
  );
}
