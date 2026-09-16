import { useLayoutEffect, useRef } from "react";
import carSketchSvg from "../three/car-sketch.svg?raw";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";

type CarSketchRevealProps = {
  eyebrow: string;
  note: string;
};

const REVEAL_WINDOW = 0.26;

export function CarSketchReveal({ eyebrow, note }: CarSketchRevealProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paths = Array.from(stage.querySelectorAll<SVGPathElement>(".sk"));
    const labels = Array.from(stage.querySelectorAll<SVGTextElement>(".sk-txt"));
    if (!paths.length) return undefined;

    const count = paths.length;
    const meta = paths.map((path, index) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      return { path, length, start: (index / count) * (1 - REVEAL_WINDOW) };
    });

    if (reduceMotion) {
      meta.forEach(({ path }) => {
        path.style.strokeDashoffset = "0";
      });
      labels.forEach((label) => {
        label.style.opacity = "1";
      });
      return undefined;
    }

    const ctx = gsap.context(() => {
      const progress = { p: 0 };
      let lastLabel = -1;

      gsap.to(progress, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "center center",
          end: () => "+=" + (window.innerWidth < 760 ? 900 : 1700),
          pin: true,
          anticipatePin: 1,
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          for (const item of meta) {
            let t = (progress.p - item.start) / REVEAL_WINDOW;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            item.path.style.strokeDashoffset = String(item.length * (1 - t));
          }
          let e = (progress.p - 0.82) / 0.14;
          e = e < 0 ? 0 : e > 1 ? 1 : e;
          if (Math.abs(e - lastLabel) > 0.01) {
            lastLabel = e;
            labels.forEach((label) => {
              label.style.opacity = String(e);
            });
          }
        },
      });
    }, section);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section className="sketch-sec" ref={sectionRef}>
      <div className="container">
        <div className="sketch-head">{eyebrow}</div>
        <div
          className="sketch-stage"
          ref={stageRef}
          dangerouslySetInnerHTML={{ __html: carSketchSvg }}
        />
        <p className="cizim-not">{note}</p>
      </div>
    </section>
  );
}
