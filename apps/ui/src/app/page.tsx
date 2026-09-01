import { Contact } from '@/components/Contact';
import { Education } from '@/components/Education';
import { Experience } from '@/components/Experience';
import { Intro } from '@/components/Intro';
import { PrintResume } from '@/components/PrintResume';
import { Projects } from '@/components/Projects';
import { Rail } from '@/components/Rail';
import { Skills } from '@/components/Skills';

/**
 * The layout from the original design handoff: a single scrolling page with a
 * sticky index rail on the left and the sections on the right, set in a display
 * serif. The shell is static markup; the sections are client components because
 * they all read the language switch.
 */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.4'/></svg>\")";

export default function Page() {
  return (
    <>
      {/* .cv-screen is hidden when printing and PrintResume takes over — the
          PDF is a separate, parser-friendly document, not a restyle. */}
      <div
        className="cv-screen"
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: 'var(--ds-color-bg)',
          // `clip`, not `hidden` — `hidden` on an ancestor silently turns the
          // rail's `position: sticky` into static scrolling.
          overflowX: 'clip',
        }}
      >
        <div
          aria-hidden="true"
          className="cv-grain"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
            opacity: 0.5,
            mixBlendMode: 'soft-light',
            backgroundImage: GRAIN,
          }}
        />

        <div
          className="cv-shell"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'var(--cv-rail-width) minmax(0, 1fr)',
            gap: 'var(--cv-shell-gap)',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '72px 48px 120px',
          }}
        >
          <Rail />

          <main
            className="cv-main"
            style={{ display: 'grid', gap: 'var(--cv-section-gap)', minWidth: 0 }}
          >
            <Intro />
            <Projects />
            <Experience />
            <Skills />
            <Education />
            <Contact />
          </main>
        </div>
      </div>

      <PrintResume />
    </>
  );
}
