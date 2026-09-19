import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "../lib/gsapSetup";

const PRELOAD_CHUNK = 10;

/** Scroll distance (px) the disassembly takes, and the pinned hold after it
 *  during which the revealed elements settle in. */
const FRAMES_PX = { desktop: 2200, mobile: 1400 };
const HOLD_PX = { desktop: 600, mobile: 450 };

type HeroDisassemblyProps = {
  /** Folder under /public/frames holding frame_0001.webp ... frame_{frameCount}.webp */
  framesFolder: string;
  frameCount: number;
  /** The hero section: it stays pinned while the sequence plays. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Hidden until the car has come apart, then its children rise into place.
   *  Give it the `hero__actions--await` class so it starts hidden from CSS —
   *  this component's effects run before a later sibling's ref is attached. */
  revealRef?: React.RefObject<HTMLElement | null>;
};

/**
 * The assembly sequence played backwards behind the hero title: the finished
 * car is on screen from the start and comes apart as the page is scrolled.
 * Decorative only — it sits behind the hero text and takes no pointer events.
 */
export function HeroDisassembly({ framesFolder, frameCount, triggerRef, revealRef }: HeroDisassemblyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const [ready, setReady] = useState(false);

  // Scroll position 0 is the last source frame (the finished car), the end of
  // the scroll is frame 1 (loose parts).
  const sourceIndex = (step: number) => frameCount - 1 - step;
  const framePath = (i: number) => `/frames/${framesFolder}/frame_${String(i + 1).padStart(4, "0")}.webp`;

  function draw(step: number) {
    const canvas = canvasRef.current;
    const img = imagesRef.current[step];
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Work in CSS pixels on a dpr-sized backing store.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Contain: parts fly outwards near the end of the disassembly, so nothing
    // may be cropped away.
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let dw: number, dh: number;
    if (imgRatio > canvasRatio) {
      dw = canvas.width / dpr;
      dh = dw / imgRatio;
    } else {
      dh = canvas.height / dpr;
      dw = dh * imgRatio;
    }
    ctx.drawImage(img, (canvas.width / dpr - dw) / 2, (canvas.height / dpr - dh) / 2, dw, dh);
  }

  useLayoutEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = new Array(frameCount);

    function loadStep(step: number): Promise<void> {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = framePath(sourceIndex(step));
        images[step] = img;
      });
    }

    async function loadAll() {
      await loadStep(0);
      imagesRef.current = images;
      if (cancelled) return;
      setReady(true);
      draw(0);

      for (let start = 1; start < frameCount; start += PRELOAD_CHUNK) {
        if (cancelled) return;
        const end = Math.min(start + PRELOAD_CHUNK, frameCount);
        await Promise.all(Array.from({ length: end - start }, (_, k) => loadStep(start + k)));
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [framesFolder, frameCount]);

  useLayoutEffect(() => {
    const hero = triggerRef.current;
    if (!hero || !ready) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      draw(0);
      return undefined;
    }

    const ctx = gsap.context(() => {
      const mobile = () => window.innerWidth < 760;
      const framesPx = () => (mobile() ? FRAMES_PX.mobile : FRAMES_PX.desktop);
      const holdPx = () => (mobile() ? HOLD_PX.mobile : HOLD_PX.desktop);
      // Share of the pinned scroll spent on the frames; the rest is the hold.
      const framesShare = () => framesPx() / (framesPx() + holdPx());

      const revealEls = revealRef?.current ? Array.from(revealRef.current.children) : [];
      const rise = revealEls.length
        ? gsap.fromTo(
            revealEls,
            { autoAlpha: 0, y: 70 },
            { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, paused: true },
          )
        : null;
      let revealed = false;

      const state = { step: 0 };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: () => "+=" + (framesPx() + holdPx()),
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Played on its own clock rather than scrubbed, so the buttons
            // always get a full rise however fast the page is scrolled.
            const done = self.progress >= framesShare() - 0.01;
            if (!rise || done === revealed) return;
            revealed = done;
            if (done) rise.play();
            else rise.reverse();
          },
        },
      });

      tl.to(state, {
        step: frameCount - 1,
        ease: "none",
        duration: framesShare(),
        onUpdate: () => {
          const index = Math.round(state.step);
          if (index !== frameRef.current) {
            frameRef.current = index;
            draw(index);
          }
        },
      }).to({}, { duration: 1 - framesShare() });
    }, hero);

    const onResize = () => draw(frameRef.current);
    window.addEventListener("resize", onResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", onResize);
    };
  }, [ready, frameCount]);

  return (
    <div className="hero-disassembly" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
