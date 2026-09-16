import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";

type HeroTitleProps = {
  text: string;
  className?: string;
};

export function HeroTitle({ text, className }: HeroTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const spans = el.querySelectorAll("span");
    const ctx = gsap.context(() => {
      gsap.from(spans, {
        yPercent: 118,
        duration: 1.05,
        ease: "power4.out",
        stagger: 0.045,
        delay: 0.15,
      });
    }, el);

    return () => ctx.revert();
  }, [text]);

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {text.split("").map((char, index) => (
        <span key={index} style={{ display: "inline-block" }}>
          {char === " " ? " " : char}
        </span>
      ))}
    </h1>
  );
}
