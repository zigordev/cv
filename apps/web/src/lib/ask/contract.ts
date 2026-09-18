import type { CaseStudyTab } from '@/lib/case-study';

export type SectionId = 'intro' | 'experience' | 'skills' | 'projects' | 'education' | 'languages';

export type AskSourceTarget =
  | { readonly type: 'section'; readonly id: SectionId }
  | { readonly type: 'project'; readonly id: string; readonly tab: CaseStudyTab };

export interface AskSource {
  readonly label: string;
  readonly target: AskSourceTarget;
}

export type Refusal = 'not_in_cv' | 'contact' | 'speculation' | 'off_topic';

export type AskAnswer =
  | {
      readonly outcome: 'answered';
      readonly answer: string;
      readonly sources: readonly AskSource[];
    }
  | { readonly outcome: 'refused'; readonly refusal: Refusal };

export const ASK_ENDPOINT = '/api/ask';
