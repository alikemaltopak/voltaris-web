import type Lenis from "lenis";
import { ScrollTrigger } from "./gsapSetup";

let instance: Lenis | null = null;

export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

/**
 * Lenis caches page height via a ResizeObserver on <html>, which never fires
 * when content grows while <html>'s own box stays pinned at height:100% (the
 * scrollbar-vs-Lenis setup this site uses). Call this after any in-place DOM
 * change that can alter document height (e.g. revealing more form fields)
 * so Lenis's scroll limit and ScrollTrigger's trigger positions stay correct.
 */
export function refreshScrollLimits() {
  instance?.resize();
  ScrollTrigger.refresh();
}

/** Scroll to top through Lenis itself (not window.scrollTo) so its internal position stays in sync. */
export function scrollToTop(options?: { immediate?: boolean }) {
  if (instance) {
    instance.scrollTo(0, options);
  } else {
    window.scrollTo(0, 0);
  }
}
