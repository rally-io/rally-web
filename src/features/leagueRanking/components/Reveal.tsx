import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: ReactNode;
  /** Milliseconds of extra delay, for staggering sibling reveals. */
  delay?: number;
  className?: string;
};

/**
 * Fades-and-rises its children the first time they scroll into view — the
 * league pages' scroll motion. One-shot on purpose: content that re-hides on
 * scroll-up reads as flicker, not depth.
 *
 * Environments with no IntersectionObserver (jsdom, ancient browsers) render
 * everything visible immediately — the animation is decoration, never a gate
 * on content. `prefers-reduced-motion` disables the transition in CSS.
 */
export function Reveal({ children, delay = 0, className }: RevealProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn('reveal-up', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
