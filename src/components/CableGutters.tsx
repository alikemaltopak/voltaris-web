import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "../lib/gsapSetup";

const PRELOAD_CHUNK = 10;

/** Below this width the side gutters are too narrow to hold the strands. */
const MIN_WIDTH = 1180;

type CableGuttersProps = {
  /** Folder under /public/frames holding frame_0001.webp ... frame_{frameCount}.webp */
  framesFolder: string;
  frameCount: number;
  /** Scrubbed while this element scrolls past; defaults to the whole page. */
  triggerRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Scroll-scrubbed cable-assembly frame sequence, drawn into the empty space on
 * either side of a narrow text column. Purely decorative: the wrapper never
 * takes pointer events, so the form underneath stays clickable.
 */
export function CableGutters({ framesFolder, frameCount, triggerRef }: CableGuttersProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [wideEnough, setWideEnough] = useState(
    () => typeof window === "undefined" || window.innerWidth >= MIN_WIDTH,
  );

  const framePath = (i: number) => `/frames/${framesFolder}/frame_${String(i + 1).padStart(4, "0")}.webp`;

  function draw(index: number) {
    const img = imagesRef.current[index];
    if (!img || !img.complete) return;

    for (const ref of [leftRef, rightRef]) {
      const canvas = ref.current;
      if (!canvas) continue;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fit by width and anchor to the bottom: the cable runs off the lower
      // edge in the source frames, so cropping there is invisible.
      const dw = canvas.width;
      const dh = dw * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, 0, canvas.height - dh, dw, dh);
    }
  }

  useLayoutEffect(() => {
    const onResize = () => setWideEnough(window.innerWidth >= MIN_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Same staged preload as the home-page assembly sequence: first frame up
  // front, the rest in small chunks so scrolling stays smooth.
  useLayoutEffect(() => {
    if (!wideEnough) return undefined;
    let cancelled = false;
    const images: HTMLImageElement[] = new Array(frameCount);

    function loadImage(index: number): Promise<void> {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = framePath(index);
        images[index] = img;
      });
    }

    async function loadAll() {
      await loadImage(0);
      imagesRef.current = images;
      if (cancelled) return;
      setReady(true);
      draw(0);

      for (let start = 1; start < frameCount; start += PRELOAD_CHUNK) {
        if (cancelled) return;
        const end = Math.min(start + PRELOAD_CHUNK, frameCount);
        await Promise.all(Array.from({ length: end - start }, (_, k) => loadImage(start + k)));
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [wideEnough, framesFolder, frameCount]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !ready || !wideEnough) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      draw(frameCount - 1);
      return undefined;
    }

    const ctx = gsap.context(() => {
      const state = { frame: 0 };
      gsap.to(state, {
        frame: frameCount - 1,
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef?.current ?? wrap,
          start: "top 80%",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const index = Math.round(state.frame);
          if (index !== frameRef.current) {
            frameRef.current = index;
            draw(index);
          }
        },
      });
    }, wrap);

    const onResize = () => draw(frameRef.current);
    window.addEventListener("resize", onResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", onResize);
    };
  }, [ready, wideEnough, frameCount, triggerRef]);

  if (!wideEnough) return null;

  return (
    <div className="cable-gutters" ref={wrapRef} aria-hidden="true">
      <canvas className="cable-gutters__strand cable-gutters__strand--left" ref={leftRef} />
      <canvas className="cable-gutters__strand cable-gutters__strand--right" ref={rightRef} />
    </div>
  );
}
