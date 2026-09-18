'use client';

import { Button } from 'design-system/components/core/Button.jsx';
import { Field } from 'design-system/components/forms/Field.jsx';
import { Textarea } from 'design-system/components/forms/Textarea.jsx';
import { Modal } from 'design-system/components/overlay/Modal.jsx';

import { AskConversation } from '@/components/AskConversation';
import { useI18n } from '@/i18n/client';
import type { AskSource } from '@/lib/ask/contract';
import type { Ask } from '@/lib/ask/use-ask';

const MAX_QUESTION_CHARS = 500;

export function AskPanel({
  ask,
  open,
  onClose,
  onContact,
}: Readonly<{ ask: Ask; open: boolean; onClose: () => void; onContact: () => void }>) {
  const { t } = useI18n();

  const follow = (source: AskSource) => {
    onClose();
    ask.follow(source);
  };

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
        <AskConversation ask={ask} onSource={follow} onContact={onContact} />

        <form
          noValidate
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            void ask.ask(ask.question);
          }}
          style={{ display: 'grid', gap: 'var(--ds-space-3)' }}
        >
          <Field label={t('ask.label')} hint={t('ask.hint')} htmlFor="cv-ask-question">
            <Textarea
              id="cv-ask-question"
              name="question"
              rows={3}
              maxLength={MAX_QUESTION_CHARS}
              value={ask.question}
              placeholder={t('ask.placeholder')}
              disabled={ask.availability !== 'open'}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                ask.setQuestion(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void ask.ask(ask.question);
                }
              }}
            />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={ask.pending}
              disabled={!ask.accepting || !ask.question.trim()}
            >
              {ask.pending ? t('ask.sending') : t('ask.submit')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
