import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dot = dotRef.current;
    if (!dot) return undefined;

    const touch = window.matchMedia("(pointer: coarse)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (touch || reduceMotion) return undefined;

    document.body.classList.add("custom-cursor");

    const moveX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const moveY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });

    function onMouseMove(event: MouseEvent) {
      moveX(event.clientX);
      moveY(event.clientY);
    }

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      document.body.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return <div ref={dotRef} className="cur-dot" aria-hidden="true" />;
}
