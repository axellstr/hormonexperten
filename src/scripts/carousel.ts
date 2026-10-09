/**
 * Progressive enhancement for scroll-snap carousels.
 * Without JS the track still swipes and scrolls; this adds dots, prev/next buttons and mouse
 * dragging (touch keeps the browser's own swiping). As in the services row, the track glides to
 * a slide and snapping is off (data-moving) while it moves. A drag past a small share of a slide
 * moves on to the next one in its direction; a shorter one glides back.
 * Reduced motion: the track jumps instead of gliding.
 *
 * Markup contract (see Hero.astro):
 *   [data-carousel]            root
 *     [data-carousel-track]    the scrolling list; its children are the slides
 *     [data-carousel-nav]      controls wrapper, `invisible` until this script runs (it keeps
 *                              its space, so revealing it doesn't shift the layout)
 *       [data-carousel-dot]    one button per slide
 *       [data-carousel-prev] / [data-carousel-next]   optional arrow buttons
 */
import { easeInOut, easeOut } from './easing';

/** Share of a slide's width a drag must cover to move on to the next slide. */
const DRAG_THRESHOLD = 0.15;

for (const root of document.querySelectorAll<HTMLElement>('[data-carousel]')) {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const nav = root.querySelector<HTMLElement>('[data-carousel-nav]');
  if (!track || !nav || track.children.length < 2) continue;

  const slides = [...track.children] as HTMLElement[];
  const dots = [...nav.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]')];
  const prev = nav.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = nav.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  nav.classList.remove('invisible');

  let active = 0;
  let glide = 0;

  // Snapping is off while the script moves the track, or the browser would fight each frame.
  const stop = () => {
    cancelAnimationFrame(glide);
    track.removeAttribute('data-moving');
  };

  const goTo = (index: number, duration = 600, ease = easeInOut) => {
    // Snapping stays off until the glide has read where it starts: turned back on first, it
    // would pull a released drag straight onto a slide.
    cancelAnimationFrame(glide);
    const target = slides[Math.min(Math.max(index, 0), slides.length - 1)];
    const padding = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
    const from = track.scrollLeft;
    const to = Math.min(target.offsetLeft - padding, track.scrollWidth - track.clientWidth);
    if (reduceMotion.matches || Math.abs(to - from) < 1) {
      track.scrollLeft = to;
      track.removeAttribute('data-moving');
      return;
    }
    track.toggleAttribute('data-moving', true);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      track.scrollLeft = from + (to - from) * ease(t);
      if (t < 1) glide = requestAnimationFrame(tick);
      else track.removeAttribute('data-moving');
    };
    glide = requestAnimationFrame(tick);
  };

  const render = () => {
    dots.forEach((dot, index) => {
      dot.toggleAttribute('data-active', index === active);
      if (index === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (prev) prev.disabled = active === 0;
    if (next) next.disabled = active === slides.length - 1;
  };

  const update = () => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    if (atEnd) {
      active = slides.length - 1;
    } else {
      const padding = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
      const position = track.scrollLeft + padding;
      active = slides.reduce(
        (best, slide, index) =>
          Math.abs(slide.offsetLeft - position) < Math.abs(slides[best].offsetLeft - position)
            ? index
            : best,
        0,
      );
    }
    render();
  };

  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
  prev?.addEventListener('click', () => goTo(active - 1));
  next?.addEventListener('click', () => goTo(active + 1));

  // Touch and trackpad take over from a glide.
  for (const type of ['touchstart', 'wheel'] as const) {
    track.addEventListener(type, stop, { passive: true });
  }

  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragStartSlide = 0;
  let dragPointer: number | null = null;

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    stop();
    dragPointer = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = track.scrollLeft;
    dragStartSlide = active;
    track.setPointerCapture(event.pointerId);
    track.toggleAttribute('data-moving', true);
  });

  track.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragPointer) return;
    event.preventDefault();
    track.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
  });

  const endDrag = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    dragPointer = null;
    update();
    const dx = event.clientX - dragStartX;
    let target = active;
    if (target === dragStartSlide && Math.abs(dx) > slides[0].offsetWidth * DRAG_THRESHOLD) {
      target += dx < 0 ? 1 : -1;
    }
    goTo(target, 450, easeOut);
  };

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', (event) => event.preventDefault());

  let frame = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}
