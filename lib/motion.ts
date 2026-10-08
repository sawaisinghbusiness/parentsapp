/** Small touch effects. Each does nothing for "Reduce motion". */

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Ink spreading from where the finger landed. Use as onPointerDown on an element that is
 * `relative overflow-hidden`; the drop removes itself when done.
 */
export function ripple(e: React.PointerEvent<HTMLElement>) {
  if (still()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2.2;
  const drop = document.createElement("span");
  drop.className = "ripple-ink";
  drop.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  el.appendChild(drop);
  drop.addEventListener("animationend", () => drop.remove());
}

/** Tilt toward the finger with a moving glare; spread onto an element styled by `.tilt` (globals.css). */
export const tilt = {
  onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (still()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add("tilting");
    el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  },
  onPointerLeave: settle,
  onPointerUp: settle,
  onPointerCancel: settle,
};

function settle(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove("tilting");
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
}
