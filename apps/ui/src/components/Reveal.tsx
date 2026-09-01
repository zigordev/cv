'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'pending' | 'in';

/** Reveal a little before the section's top edge reaches the fold. */
const VIEWPORT_TRIGGER = 0.92;

/**
 * Last resort. Some embedded webviews and headless renderers suspend the whole
 * rendering lifecycle: no requestAnimationFrame, no scroll events, and no
 * IntersectionObserver callbacks. Nothing would ever reveal the section there,
 * and a CV that renders blank is far worse than one that skips an animation.
 */
const FAILSAFE_MS = 3000;

/**
 * The sections' fade-and-rise entrance.
 *
 * Built so content is visible unless JS actively decides to animate it: the
 * server renders no hidden state, and the hidden state is applied only after
 * mount, once we know the reader has not asked for reduced motion. Every path
 * out of `pending` is redundant on purpose — observer, scroll listener, and a
 * timer — because the failure mode of getting this wrong is invisible text.
 */
export function Reveal({ id, children }: Readonly<{ id: string; children: React.ReactNode }>) {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // stays 'idle', i.e. plainly visible

    const isInView = () => el.getBoundingClientRect().top < window.innerHeight * VIEWPORT_TRIGGER;

    // Already on screen at mount — don't hide it just to fade it back in.
    if (isInView()) {
      setPhase('in');
      return;
    }

    setPhase('pending');

    let settled = false;

    function cleanup() {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(failsafe);
    }

    function reveal() {
      if (settled) return;
      settled = true;
      setPhase('in');
      cleanup();
    }

    function onScroll() {
      if (isInView()) reveal();
    }

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) reveal();
            },
            { rootMargin: '0px 0px -8% 0px' }
          )
        : null;

    observer?.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    const failsafe = window.setTimeout(reveal, FAILSAFE_MS);

    return cleanup;
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      style={
        phase === 'idle'
          ? undefined
          : {
              opacity: phase === 'in' ? 1 : 0,
              transform: phase === 'in' ? 'none' : 'translateY(18px)',
              transition:
                phase === 'in'
                  ? 'opacity 520ms var(--ds-ease-out), transform 520ms var(--ds-ease-out)'
                  : undefined,
            }
      }
    >
      {children}
    </section>
  );
}
