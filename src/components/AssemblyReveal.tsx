import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "../lib/gsapSetup";
import { SectionHeading } from "./SectionHeading";

const PRELOAD_CHUNK = 10;

type AssemblyRevealProps = {
  title?: string;
  labelLeft?: string;
  labelRight?: string;
  note?: string;
  /** Folder under /public/frames containing frame_0001.png ... frame_{frameCount}.png */
  framesFolder: string;
  frameCount: number;
  ariaLabel: string;
};

export function AssemblyReveal({
  title,
  labelLeft,
  labelRight,
  note,
  framesFolder,
  frameCount,
  ariaLabel,
}: AssemblyRevealProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameRef = useRef(0);
  const [ready, setReady] = useState(false);

  const framePath = (i: number) => `/frames/${framesFolder}/frame_${String(i + 1).padStart(4, "0")}.webp`;

  function draw(index: number) {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgRatio > canvasRatio) {
      dh = canvas.height;
      dw = dh * imgRatio;
      dx = (canvas.width - dw) / 2;
      dy = 0;
    } else {
      dw = canvas.width;
      dh = dw / imgRatio;
      dx = 0;
      dy = (canvas.height - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // Preload: frame 0 first (so something paints immediately), then the rest
  // in small background chunks so we never block the main thread for long.
  useLayoutEffect(() => {
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
        const chunk: Promise<void>[] = [];
        for (let i = start; i < end; i++) chunk.push(loadImage(i));
        await Promise.all(chunk);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !ready) return undefined;

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
          trigger: section,
          start: "center center",
          end: () => "+=" + (window.innerWidth < 760 ? 1200 : 2000),
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
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
    }, section);

    const onResize = () => draw(frameRef.current);
    window.addEventListener("resize", onResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", onResize);
    };
  }, [ready]);

  const hasText = title || labelLeft || labelRight || note;

  return (
    <section className="assembly-reveal" ref={sectionRef}>
      <div className="container">
        {hasText && (
          <>
            {title && <SectionHeading title={title} />}
            {(labelLeft || labelRight) && (
              <div className="sec-label">
                <span>{labelLeft}</span>
                <span>{labelRight}</span>
              </div>
            )}
          </>
        )}
        <div className="assembly-reveal__stage">
          <canvas ref={canvasRef} aria-label={ariaLabel} />
          {!ready && (
            <div className="assembly-reveal__loading" aria-hidden="true">
              <span className="note">…</span>
            </div>
          )}
        </div>
        {note && <p className="cizim-not">{note}</p>}
      </div>
    </section>
  );
}
