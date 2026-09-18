export type CaseStudyTab = 'overview' | 'architecture' | 'pipelines';

export const CASE_STUDY_TABS: readonly CaseStudyTab[] = ['overview', 'architecture', 'pipelines'];

export const OPEN_CASE_STUDY_EVENT = 'cv:open-case-study';

export interface OpenCaseStudyDetail {
  readonly id: string;
  readonly tab: CaseStudyTab;
}

export function openCaseStudy(detail: OpenCaseStudyDetail): void {
  globalThis.dispatchEvent(new CustomEvent<OpenCaseStudyDetail>(OPEN_CASE_STUDY_EVENT, { detail }));
}
