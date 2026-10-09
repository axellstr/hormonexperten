/**
 * On phones, turn the hero trust signals through one compact slot using the same prism motion as
 * the trust logos. The complete copy remains in the hero for assistive technology.
 */

const HOLD = 2000;
const FIRST = 800;
const TURN_DURATION = 700;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  function swap() {
    if (reduceMotion.matches || row.offsetParent === null) return;

    const outgoing = target.querySelector<HTMLElement>('[data-index]');
    if (!outgoing) return;

    const current = Number(outgoing.dataset.index);
    while (next === current) next = (next + 1) % pool.length;

    const incoming = pool[next].cloneNode(true) as HTMLElement;
    next = (next + 1) % pool.length;

    outgoing.classList.add('animate-logo-out');
    incoming.classList.add('animate-logo-in');
    target.append(incoming);

    const settle = () => {
      outgoing.remove();
      incoming.classList.remove('animate-logo-in');
    };
    incoming.addEventListener('animationend', settle, { once: true });
    // Animation clocks can be suspended independently of page timers in a background tab.
    window.setTimeout(settle, TURN_DURATION);
  }

  function tick() {
    swap();
    fresh = false;
    timer = window.setTimeout(tick, HOLD);
  }

  function update() {
    const running =
      onScreen && !document.hidden && !reduceMotion.matches && row.offsetParent !== null;

    if (running && timer === undefined) {
      timer = window.setTimeout(tick, fresh ? FIRST : HOLD);
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
