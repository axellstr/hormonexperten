/**
 * Drag-to-pan for the testimonial rows.
 * Touch keeps the browser's own scrolling. A mouse can grab the row.
 * Each row starts centered; a staggered row sits half a card to the side,
 * matching the clipped two-row layout.
 */

function pitchOf(track: HTMLElement) {
  const card = track.querySelector('li');
  if (!card) return 0;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function repeatWidth(scroller: HTMLElement) {
  const track = scroller.querySelector('ul');
  const itemCount = Number(scroller.dataset.cycleItems);
  if (!track || !itemCount) return 0;
  return pitchOf(track) * itemCount;
}

function place(scroller: HTMLElement) {
  const track = scroller.querySelector('ul');
  if (!track) return;

  track.style.marginInlineStart = '0px';
  scroller.style.display = 'block';
  scroller.style.overflowX = 'auto';

  const max = scroller.scrollWidth - scroller.clientWidth;
  const shift = scroller.hasAttribute('data-stagger') ? pitchOf(track) / 2 : 0;
  scroller.scrollLeft = max / 2 - shift;
}

function normaliseScroll(scroller: HTMLElement) {
  const cycle = repeatWidth(scroller);
  const max = scroller.scrollWidth - scroller.clientWidth;
  const upper = max - cycle;
  if (!cycle || cycle > upper) return;

  while (scroller.scrollLeft < cycle) scroller.scrollLeft += cycle;
  while (scroller.scrollLeft > upper) scroller.scrollLeft -= cycle;
}

function enableGrab(scroller: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startLeft = 0;

  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startLeft = scroller.scrollLeft;
    scroller.setPointerCapture(event.pointerId);
  });

  scroller.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    const rtl = getComputedStyle(scroller).direction === 'rtl';
    scroller.scrollLeft = startLeft - (rtl ? -dx : dx);
  });

  const end = () => {
    if (moved) {
      userMoved = true;
      normaliseScroll(scroller);
    }
    dragging = false;
  };
  scroller.addEventListener('pointerup', end);
  scroller.addEventListener('pointercancel', end);
  scroller.addEventListener('dragstart', (event) => event.preventDefault());
  scroller.addEventListener(
    'click',
    (event) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    },
    true,
  );

  scroller.addEventListener('keydown', (event) => {
    const track = scroller.querySelector('ul');
    if (!track) return;
    const pitch = pitchOf(track);
    const rtl = getComputedStyle(scroller).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key !== forward && event.key !== back) return;
    scroller.scrollBy({
      left: (event.key === forward ? 1 : -1) * pitch,
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
    event.preventDefault();
  });
}

const scrollers = [...document.querySelectorAll<HTMLElement>('[data-grab]')];
let userMoved = false;

for (const scroller of scrollers) {
  place(scroller);
  enableGrab(scroller);
}

window.addEventListener('resize', () => {
  for (const scroller of scrollers) place(scroller);
});

document.fonts?.ready.then(() => {
  if (userMoved) return;
  for (const scroller of scrollers) place(scroller);
});
