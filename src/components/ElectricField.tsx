import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type Node = { x: number; y: number; f: number };

const COLUMNS = 5;
const ROWS_PER_1000PX = 5.5;
const RANGE = 190;

export function ElectricField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion) return undefined;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let mouseActive = false;
    let frame = 0;
    let t = 0;

    let arcColor = "#22d3ee";
    let sparkColor = "#cff9ff";

    function readColors() {
      const styles = getComputedStyle(document.documentElement);
      arcColor = styles.getPropertyValue("--accent").trim() || arcColor;
      sparkColor = styles.getPropertyValue("--spark").trim() || sparkColor;
    }
    readColors();

    function onThemeChange() {
      readColors();
    }
    window.addEventListener("voltaris:theme-change", onThemeChange);

    function resizeCanvas() {
      if (!canvas) return;
      // Floor at 1: zoomed-out browsers report a fractional ratio, which would
      // both blur the arcs and shrink the backing store below the CSS size.
      dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function distributeNodes() {
      nodes = [];
      const width = window.innerWidth;
      const height = document.documentElement.scrollHeight;
      const rows = Math.max(4, Math.round((height / 1000) * ROWS_PER_1000PX));
      const cellW = width / COLUMNS;
      const cellH = height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLUMNS; c++) {
          nodes.push({
            x: cellW * (c + 0.22 + Math.random() * 0.56),
            y: cellH * (r + 0.22 + Math.random() * 0.56),
            f: Math.random() * 6.28,
          });
        }
      }
    }

    function bolt(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      displace: number,
      depth: number,
      out: [number, number][],
    ) {
      if (depth === 0) {
        out.push([x2, y2]);
        return;
      }
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;
      bolt(x1, y1, mx, my, displace / 2, depth - 1, out);
      bolt(mx, my, x2, y2, displace / 2, depth - 1, out);
    }

    function drawPath(points: [number, number][], width: number, alpha: number, color: string) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    function tick() {
      if (!ctx || !canvas) return;
      t += 0.016;
      // The context is scaled by dpr, so the clear has to be in CSS pixels —
      // passing the backing-store size leaves stale arcs on screen.
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      const scrollY = window.scrollY;
      const viewportH = window.innerHeight;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const drawY = node.y - scrollY;
        if (drawY < -80 || drawY > viewportH + 80) continue;

        const pulse = 0.55 + Math.sin(t * 1.6 + node.f) * 0.2;
        const dist = mouseActive ? Math.hypot(mouseX - node.x, mouseY - drawY) : 9999;
        const near = dist < RANGE;
        const strength = near ? 1 - dist / RANGE : 0;

        ctx.beginPath();
        ctx.arc(node.x, drawY, near ? 2.4 + strength * 1.6 : 1.6, 0, Math.PI * 2);
        ctx.globalAlpha = near ? 0.35 + strength * 0.65 : 0.16 * pulse;
        ctx.fillStyle = arcColor;
        ctx.fill();

        if (near && Math.random() < 0.55 + strength * 0.4) {
          const arms = 1 + Math.round(strength * 2);
          for (let k = 0; k < arms; k++) {
            const hx = mouseX + (Math.random() - 0.5) * 14;
            const hy = mouseY + (Math.random() - 0.5) * 14;
            const points: [number, number][] = [[node.x, drawY]];
            bolt(node.x, drawY, hx, hy, 26 + strength * 22, 5, points);
            drawPath(points, 2.6, 0.1 * strength, arcColor);
            drawPath(points, 0.9, 0.45 + strength * 0.5, k === 0 ? sparkColor : arcColor);
          }
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(tick);
    }

    function onMouseMove(event: MouseEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      mouseActive = true;
    }
    function onMouseLeave() {
      mouseActive = false;
    }
    function onResize() {
      resizeCanvas();
      distributeNodes();
    }

    resizeCanvas();
    distributeNodes();
    frame = requestAnimationFrame(tick);

    if (!touch) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseleave", onMouseLeave);
    }
    window.addEventListener("resize", onResize);

    const redistributeTimer = window.setTimeout(distributeNodes, 350);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(redistributeTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("voltaris:theme-change", onThemeChange);
    };
  }, [location.pathname]);

  return <canvas ref={canvasRef} className="electric-field" aria-hidden="true" />;
}
