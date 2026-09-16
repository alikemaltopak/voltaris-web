import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "../lib/gsapSetup";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger children of the wrapper instead of animating the wrapper as one block. */
  stagger?: string;
  y?: number;
  delay?: number;
};

export function Reveal({ children, className, stagger, y = 28, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const targets = stagger ? el.querySelectorAll(stagger) : el;
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay,
        stagger: stagger ? 0.1 : 0,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
