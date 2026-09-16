import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";

export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.09 });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Route changes swap the whole page's content/height. Reset scroll through
  // Lenis itself (not window.scrollTo) so its internal position stays in sync,
  // then refresh ScrollTrigger once the new layout has settled — otherwise
  // scroll can feel stuck or fail to reach the true bottom of the new page.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }

    const id = window.setTimeout(() => {
      lenis?.resize();
      ScrollTrigger.refresh();
    }, 60);

    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return null;
}
