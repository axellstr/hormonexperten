/**
 * Trust logo cycler. Every two seconds the logos in the row turn like a prism, one after another
 * from left to right: the old logo rolls up and away as the next one rolls up into view. Runs only
 * when there are more logos than visible slots, and stays still for reduced motion. It quietly
 * pauses on hover, in a hidden tab and off-screen, and turns soon after the row comes back.
 */

const HOLD = 2000; // ms between turns
const FIRST = 800; // ms before the first turn once the row comes into view
const STAGGER = 90; // ms between neighbouring slots

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function cycle(row: HTMLElement) {
  const template = row.querySelector<HTMLTemplateElement>('template[data-pool]');
  if (!template) return;
  const pool = [...template.content.querySelectorAll<HTMLImageElement>('img')];
  const slots = [...row.querySelectorAll<HTMLElement>('[data-slot]')];
  if (pool.length <= 3) return; // never more logos than the smallest row shows

  let next = -1; // set on the first swap, after the logos already on screen
  let timer: number | undefined;
  let hovered = false;
  let onScreen = false;
  let warmed = false;
  let fresh = true; // the row has just come into view: turn soon rather than after a full hold

  const visibleSlots = () => slots.filter((slot) => slot.offsetParent !== null);
  const indexOf = (slot: HTMLElement) => Number(slot.querySelector('img')?.dataset.index);

  function swap() {
    const active = visibleSlots();
    if (pool.length <= active.length || reduceMotion.matches) return;
    if (next < 0) next = active.length % pool.length;
    // Each slot takes the next logo in line that isn't its own and isn't already coming in
    // elsewhere. There are more logos than slots, so one is always free.
    const incomingSet = new Set<number>();

    active.forEach((slot, position) => {
      const current = indexOf(slot);
      while (incomingSet.has(next) || next === current) next = (next + 1) % pool.length;
      const incoming = pool[next].cloneNode() as HTMLImageElement;
      incomingSet.add(next);
      next = (next + 1) % pool.length;

      const outgoing = slot.querySelector('img');
      if (!outgoing) return;
      // Both logos share the slot's grid cell and turn together, like two faces of one prism.
      const delay = `${position * STAGGER}ms`;
      outgoing.style.animationDelay = delay;
      incoming.style.animationDelay = delay;
      outgoing.classList.add('animate-logo-out');
      incoming.classList.add('animate-logo-in');
      outgoing.addEventListener('animationend', () => outgoing.remove(), { once: true });
      incoming.addEventListener(
        'animationend',
        () => {
          incoming.classList.remove('animate-logo-in');
          incoming.style.animationDelay = '';
        },
        { once: true },
      );
      slot.append(incoming);
    });
  }

  function tick() {
    swap();
    fresh = false;
    timer = window.setTimeout(tick, HOLD);
  }

  function update() {
    const running = onScreen && !hovered && !document.hidden && !reduceMotion.matches;
    if (running && timer === undefined) {
      timer = window.setTimeout(tick, fresh ? FIRST : HOLD);
    } else if (!running && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }

  row.addEventListener('mouseenter', () => ((hovered = true), update()));
  row.addEventListener('mouseleave', () => ((hovered = false), update()));
  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener('change', update);

  // Count the row as on screen once half of it shows, so the first turn happens where people see it.
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (!onScreen) fresh = true;
      if (onScreen && !warmed) {
        // Fetch the waiting logos so the first turn doesn't show an empty slot.
        pool.forEach((img) => (new Image().src = img.src));
        warmed = true;
      }
      update();
    },
    { threshold: 0.5 },
  ).observe(row);
}

document.querySelectorAll<HTMLElement>('[data-logo-cycler]').forEach(cycle);
