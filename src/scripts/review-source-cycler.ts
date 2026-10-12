/**
 * Mobile review-source carousel. Three cards sit in a horizontal row: the centre one at 80%
 * opacity, its neighbours quieter. Every few seconds the track slides one step on the X axis
 * (2D, no prism roll). Items are tripled so the loop can wrap without a jump. Desktop uses the
 * three-column grid instead, so this only runs while the cycler is visible.
 */

const HOLD = 2800;
const FIRST = 900;
const SLIDE = 700; // matches --ease-smooth duration used on the track
const CENTER_OPACITY = 0.8;
const SIDE_OPACITY = 0.35;
const FAR_OPACITY = 0.15;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function cycle(root: HTMLElement) {
  const trackEl = root.querySelector<HTMLElement>('[data-track]');
  if (!trackEl) return;
  const track = trackEl;

  const items = [...track.querySelectorAll<HTMLElement>('[data-index]')];
  const unique = Number(root.dataset.count) || 0;
  if (unique < 2 || items.length < unique * 2) return;

  // Start on the middle copy so we can slide either way without hitting an edge.
  let active = unique;
  let timer: number | undefined;
  let hovered = false;
  let onScreen = false;
  let fresh = true;
  let animating = false;

  function pitch() {
    const first = items[0];
    const second = items[1];
    if (!first || !second) return first?.offsetWidth ?? 0;
    return second.offsetLeft - first.offsetLeft;
  }

  function paint(immediate = false) {
    const step = pitch();
    if (!step) return;

    track.style.transition = immediate || reduceMotion.matches ? 'none' : '';
    // Centre the active card in the viewport.
    const offset = active * step - (root.clientWidth - items[0].offsetWidth) / 2;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;

    items.forEach((item, index) => {
      const distance = Math.abs(index - active);
      item.style.opacity =
        distance === 0
          ? String(CENTER_OPACITY)
          : distance === 1
            ? String(SIDE_OPACITY)
            : String(FAR_OPACITY);
    });
  }

  function wrapIfNeeded() {
    // Snap back into the middle copy after a slide past either end.
    if (active < unique) {
      active += unique;
      paint(true);
    } else if (active >= unique * 2) {
      active -= unique;
      paint(true);
    }
  }

  function advance() {
    if (reduceMotion.matches || root.offsetParent === null || animating) return;
    animating = true;
    active += 1;
    paint();
    window.setTimeout(() => {
      wrapIfNeeded();
      animating = false;
    }, SLIDE);
  }

  function tick() {
    advance();
    fresh = false;
    timer = window.setTimeout(tick, HOLD + SLIDE);
  }

  function update() {
    const running =
      onScreen &&
      !hovered &&
      !document.hidden &&
      !reduceMotion.matches &&
      root.offsetParent !== null;

    if (running && timer === undefined) {
      timer = window.setTimeout(tick, fresh ? FIRST : HOLD);
    } else if (!running && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }

  root.addEventListener('pointerenter', () => ((hovered = true), update()));
  root.addEventListener('pointerleave', () => ((hovered = false), update()));
  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener('change', () => {
    paint(true);
    update();
  });

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!onScreen) fresh = true;
      update();
    },
    { threshold: 0.4 },
  ).observe(root);

  const desktop = window.matchMedia('(min-width: 640px)');
  desktop.addEventListener('change', update);

  // Layout can settle after fonts/images; re-centre once the logos load.
  paint(true);
  window.addEventListener('resize', () => paint(true));
  requestAnimationFrame(() => paint(true));
  update();
}

document.querySelectorAll<HTMLElement>('[data-review-cycler]').forEach(cycle);

export {};
