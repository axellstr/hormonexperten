/**
 * Progressive enhancement for scroll-snap carousels.
 * Without JS the track still swipes and scrolls; this adds dots and prev/next buttons.
 *
 * Markup contract (see Hero.astro):
 *   [data-carousel]            root
 *     [data-carousel-track]    the scrolling list; its children are the slides
 *     [data-carousel-nav]      controls wrapper, `invisible` until this script runs (it keeps
 *                              its space, so revealing it doesn't shift the layout)
 *       [data-carousel-dot]    one button per slide
 *       [data-carousel-prev] / [data-carousel-next]   optional arrow buttons
 */
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

  const goTo = (index: number) => {
    const target = slides[Math.min(Math.max(index, 0), slides.length - 1)];
    const padding = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
    track.scrollTo({
      left: target.offsetLeft - padding,
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
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

  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragPointer: number | null = null;

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragPointer = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
    track.toggleAttribute('data-dragging', true);
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
    track.removeAttribute('data-dragging');
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
