'use client';

import { useCv } from '@/content/useCv';

/**
 * The document that actually prints.
 *
 * "Download PDF" is `window.print()`, so the print output IS the file a
 * recruiter uploads — and the on-screen layouts are close to worst case for the
 * parsers that read it. Applicant tracking systems extract text in visual
 * order, so a sticky side rail and two-column rows interleave dates into
 * sentences; decorative headings ("Four things built after hours") do not match
 * the section names parsers look for; and the case-study detail lives in a
 * modal that never prints at all.
 *
 * So printing does not restyle the screen — it swaps in this document instead.
 * The rules it follows, in rough order of how much they matter:
 *
 *   1. One column, one reading order. Nothing side by side, ever.
 *   2. Conventional section headings — SUMMARY, SKILLS, EXPERIENCE, PROJECTS,
 *      EDUCATION — because parsers match on those literal words.
 *   3. Name first, then a plain-text contact line. Never in a page header,
 *      which extraction frequently drops.
 *   4. A common sans-serif stack rather than the display serif: fewer
 *      ligatures and unusual glyphs to garble on extraction.
 *   5. Real text throughout. No icons, arrows or glyphs carrying meaning, and
 *      URLs written out rather than hidden behind link text.
 *   6. Each role as Title / Company / Location / Dates on their own lines, in
 *      reverse-chronological order, with achievements as real list items.
 *
 * None of this is a guarantee — parsers vary and some are simply bad — but it
 * removes the failure modes that are known and avoidable.
 */

const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

const sheet: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: SANS,
    fontSize: '10.5pt',
    lineHeight: 1.4,
    color: '#000',
    background: '#fff',
  },
  name: {
    margin: 0,
    fontSize: '20pt',
    lineHeight: 1.15,
    fontWeight: 700,
    letterSpacing: 0,
  },
  title: {
    margin: '2pt 0 0',
    fontSize: '12pt',
    fontWeight: 400,
  },
  contact: {
    margin: '6pt 0 0',
    fontSize: '9.5pt',
  },
  heading: {
    margin: '16pt 0 6pt',
    fontSize: '11pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #000',
    paddingBottom: '2pt',
  },
  entry: { marginBottom: '10pt', breakInside: 'avoid' },
  entryTitle: { margin: 0, fontSize: '11pt', fontWeight: 700 },
  entryMeta: { margin: '1pt 0 0', fontSize: '9.5pt' },
  body: { margin: '3pt 0 0' },
  list: { margin: '3pt 0 0', paddingLeft: '14pt' },
  item: { marginBottom: '2pt' },
};

/** Values are stored as full URLs; a CV reads better without the scheme. */
function displayValue(value: string): string {
  return value.replace(/^https?:\/\//, '');
}

export function PrintResume() {
  const { education, identity, jobs, languages, projects, skillGroups, labels } = useCv();
  const label = labels.pdf;
  const fullName = `${identity.firstName} ${identity.lastName}`;
  const contactLine = identity.location;

  return (
    <div className="cv-print" style={sheet.page}>
      <header style={{ breakInside: 'avoid' }}>
        <h1 style={sheet.name}>{fullName}</h1>
        <p style={sheet.title}>{identity.title}</p>
        {/* Location only. There is deliberately no email, phone or profile
            link here: nothing on this CV should publish a way to reach a
            person directly, and the site's contact form reaches the same
            inbox without doing so. The cost is real and accepted — an ATS
            keys on the email address, so a parsed record from this PDF has
            no contact field. */}
        <p style={sheet.contact}>{contactLine}</p>
      </header>

      <h2 style={sheet.heading}>{label.summary}</h2>
      <p style={{ margin: 0 }}>{identity.summary}</p>

      <h2 style={sheet.heading}>{label.experience}</h2>
      {jobs.map((job) => (
        <div key={`${job.company}-${job.period}`} style={sheet.entry}>
          <h3 style={sheet.entryTitle}>{job.role}</h3>
          <p style={sheet.entryMeta}>
            {job.company} | {job.location} | {job.period}
          </p>
          <p style={sheet.body}>{job.summary}</p>
          {job.bullets.length > 0 ? (
            <ul style={sheet.list}>
              {job.bullets.map((bullet) => (
                <li key={bullet} style={sheet.item}>
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      <h2 style={sheet.heading}>{label.skills}</h2>
      {skillGroups.map((group) => (
        <p key={group.group} style={{ margin: '0 0 3pt' }}>
          <strong>{group.group}:</strong> {group.items.join(', ')}
        </p>
      ))}

      <h2 style={sheet.heading}>{label.projects}</h2>
      {projects.map((project) => (
        <div key={project.id} style={sheet.entry}>
          <h3 style={sheet.entryTitle}>
            {[
              project.name,
              labels.projectKinds[project.kind],
              project.status ? labels.projectStatuses[project.status] : null,
            ]
              .filter(Boolean)
              .join(' | ')}
          </h3>
          <p style={sheet.entryMeta}>{project.role}</p>
          <p style={sheet.body}>{project.tagline}</p>
          <p style={{ margin: '3pt 0 0' }}>
            <strong>{label.stack}:</strong> {project.stack.join(', ')}
          </p>
          {project.decisions.length > 0 ? (
            <ul style={sheet.list}>
              {project.decisions.map((decision) => (
                <li key={decision} style={sheet.item}>
                  {decision}
                </li>
              ))}
            </ul>
          ) : null}
          {project.url ? (
            <p style={{ ...sheet.entryMeta, margin: '3pt 0 0' }}>{displayValue(project.url)}</p>
          ) : null}
        </div>
      ))}

      <h2 style={sheet.heading}>{label.education}</h2>
      {education.map((entry) => (
        <div key={entry.degree} style={sheet.entry}>
          <h3 style={sheet.entryTitle}>{entry.degree}</h3>
          <p style={sheet.entryMeta}>
            {entry.school} | {entry.period}
          </p>
          {entry.detail ? <p style={sheet.body}>{entry.detail}</p> : null}
        </div>
      ))}
      <h2 style={sheet.heading}>{label.languages}</h2>
      {languages.map((language) => (
        <p key={language.name} style={{ margin: '0 0 3pt' }}>
          <strong>{language.name}:</strong> {language.level}
        </p>
      ))}

    </div>
  );
}
