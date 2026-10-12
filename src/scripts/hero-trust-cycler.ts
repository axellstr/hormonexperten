/**
 * Turn the hero trust signals through one compact slot using the same letter-by-letter prism roll
 * as the booking button (RollText / roll-face). The complete copy remains in the hero for
 * assistive technology.
 */

const PAUSE = 1600; // visible rest after a turn settles
const FIRST = 800;
const ROLL = 500; // matches roll-face
const STAGGER = 30; // matches --roll-index step on roll-face

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function faces(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLElement>('.roll-face')];
}

function rollMs(count: number) {
  return ROLL + STAGGER * Math.max(count - 1, 0);
}

function cycle(row: HTMLElement) {
  const template = row.querySelector<HTMLTemplateElement>('template[data-pool]');
  const slot = row.querySelector<HTMLElement>('[data-slot]');
  if (!template || !slot) return;

  const target = slot;
  const pool = [...template.content.querySelectorAll<HTMLElement>('[data-index]')];
  if (pool.length <= 1) return;

  let next = 1;
  let timer: number | undefined;
  const initialRect = row.getBoundingClientRect();
  let onScreen = initialRect.bottom > 0 && initialRect.top < window.innerHeight;
  let fresh = true;

  function settle(outgoing: HTMLElement, incoming: HTMLElement, duration: number) {
    window.setTimeout(() => {
      outgoing.remove();
      for (const face of faces(incoming)) face.classList.remove('roll-in', 'roll-out');
    }, duration);
  }

  /** Returns how long the turn runs, or 0 if nothing moved. */
  function swap(): number {
    if (reduceMotion.matches || row.offsetParent === null) return 0;

    const outgoing = target.querySelector<HTMLElement>('[data-index]');
    if (!outgoing) return 0;

    const current = Number(outgoing.dataset.index);
    while (next === current) next = (next + 1) % pool.length;

    const incoming = pool[next].cloneNode(true) as HTMLElement;
    next = (next + 1) % pool.length;

    const outFaces = faces(outgoing);
    const inFaces = faces(incoming);
    if (outFaces.length === 0 && inFaces.length === 0) return 0;

    for (const face of inFaces) face.classList.add('roll-in');
    target.append(incoming);
    // Force a frame at the resting/out poses so the transition runs.
    void incoming.offsetWidth;
    for (const face of outFaces) face.classList.add('roll-out');
    for (const face of inFaces) face.classList.remove('roll-in');

    const duration = Math.max(rollMs(outFaces.length), rollMs(inFaces.length));
    settle(outgoing, incoming, duration);
    return duration;
  }

  function tick() {
    const duration = swap();
    fresh = false;
    timer = window.setTimeout(tick, duration + PAUSE);
  }

  function update() {
    const running =
      onScreen && !document.hidden && !reduceMotion.matches && row.offsetParent !== null;

    if (running && timer === undefined) {
      timer = window.setTimeout(tick, fresh ? FIRST : PAUSE);
    } else if (!running && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }

  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener('change', update);

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!onScreen) fresh = true;
      update();
    },
    { threshold: 0.5 },
  ).observe(row);

  update();
}

document.querySelectorAll<HTMLElement>('[data-hero-trust-cycler]').forEach(cycle);

export {};
