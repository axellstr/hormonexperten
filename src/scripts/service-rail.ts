/**
 * The services row. It rests on a card (CSS scroll snap) and touch keeps the browser's own
 * scrolling. The arrow buttons beside the title move it one card at a time. Once the row has
 * been on screen long enough to read the first cards, it slides one card on by itself, so the
 * next service comes in from the right and shows there is more.
 * Reduced motion: no intro slide, and the arrows jump instead of gliding.
 */
import { easeInOut } from './easing';

/** How long the row stays on screen before the intro slide, so the first cards can be read. */
const READ_DELAY = 1500;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function setupRail(rail: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const section = rail.closest('section') ?? document;
  const controls = section.querySelector<HTMLElement>('[data-rail-controls]');
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-rail-step]')];
  let frame = 0;
  // Where a glide is heading, so a quick second click goes one card further.
  let goal: number | null = null;
  // Set once the visitor moves the row; the intro slide never overrides them.
  let touched = false;

  // Positions run from 0 (first card) to the end of the row, whatever the text direction.
  const sign = () => (getComputedStyle(rail).direction === 'rtl' ? -1 : 1);
  const end = () => rail.scrollWidth - rail.clientWidth;
  const position = () => rail.scrollLeft * sign();
  const moveTo = (x: number) => {
    rail.scrollLeft = x * sign();
  };
  // A card's padding is the gap, so a card's width is the distance between snap points.
  const pitch = () => rail.querySelector('li')?.getBoundingClientRect().width ?? 0;

  /** The resting place nearest x: a card's start, or the end of the row. */
  function settle(x: number) {
    const step = pitch();
    const last = end();
    if (!step) return clamp(x, 0, last);
    const card = clamp(Math.round(x / step) * step, 0, last);
    return Math.abs(last - x) < Math.abs(card - x) ? last : card;
  }

  // Snapping is off while the script moves the row, or the browser would fight each frame.
  function stop() {
    cancelAnimationFrame(frame);
    goal = null;
    delete rail.dataset.moving;
  }

  function glide(to: number, duration: number) {
    stop();
    const from = position();
    if (reduceMotion.matches || Math.abs(to - from) < 1) {
      moveTo(to);
      return;
    }
    goal = to;
    rail.dataset.moving = '';
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      moveTo(from + (to - from) * easeInOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else stop();
    };
    frame = requestAnimationFrame(tick);
  }

  /** Move by whole cards: 1 is the next card, -1 the previous one. */
  function step(cards: number, duration: number) {
    glide(settle((goal ?? position()) + cards * pitch()), duration);
  }

  // Arrows: hidden while every card fits, and marked disabled at either end. aria-disabled
  // rather than `disabled`, so a button doesn't drop keyboard focus when the row reaches the end.
  let queued = 0;
  function update() {
    queued = 0;
    const last = end();
    if (controls) controls.hidden = last < 1;
    const at = goal ?? position();
    for (const button of buttons) {
      const atEdge = Number(button.dataset.railStep) < 0 ? at < 1 : at > last - 1;
      button.setAttribute('aria-disabled', String(atEdge));
    }
  }
  const queueUpdate = () => {
    queued ||= requestAnimationFrame(update);
  };
  rail.addEventListener('scroll', queueUpdate, { passive: true });
  new ResizeObserver(queueUpdate).observe(rail);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      touched = true;
      step(Number(button.dataset.railStep), 600);
      update();
    });
  }

  // Touch, wheel and trackpad take over from the script; keyboard use just cancels the intro.
  for (const type of ['touchstart', 'wheel'] as const) {
    rail.addEventListener(
      type,
      () => {
        touched = true;
        stop();
      },
      { passive: true },
    );
  }
  rail.addEventListener('keydown', () => {
    touched = true;
  });

  // Intro: once most of the row has been on screen for READ_DELAY, slide the next card in.
  // Scrolling it back out of view before then restarts the wait.
  if (reduceMotion.matches) return;
  let timer = 0;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (touched) {
        observer.disconnect();
        return;
      }
      const needed = Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.6;
      const inView = entry.isIntersecting && entry.intersectionRect.height >= needed;
      if (!inView) {
        window.clearTimeout(timer);
        timer = 0;
        return;
      }
      timer ||= window.setTimeout(() => {
        observer.disconnect();
        if (!touched && end() >= 1) step(1, 1100);
      }, READ_DELAY);
    },
    { threshold: Array.from({ length: 11 }, (_, index) => index / 10) },
  );
  observer.observe(rail);
}

for (const rail of document.querySelectorAll<HTMLElement>('[data-service-rail]')) setupRail(rail);
