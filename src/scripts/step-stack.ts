/**
 * How it Works: the step cards stack as the page scrolls (the stack-* utilities in global.css).
 * This script turns the stack on and measures it; as each card slides over the one before, it
 * sinks the covered cards back (--stack-depth) and moves the step list beside the deck along
 * (--stack-progress on its line, data-reached/data-current on its steps). Below lg it also pins
 * the section heading above the deck (data-pinned) when the screen has room for both. Where things
 * stick moves with the header (--stack-top), so it is read afresh rather than kept.
 * Without it the cards simply follow one another.
 */

/** How far a card has to have landed before the step list calls it the current step. */
const LANDED = 0.95;

function setupStack(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-stack-list]');
  const cards = [...root.querySelectorAll<HTMLElement>('[data-stack-card]')];
  const markers = [...root.querySelectorAll<HTMLElement>('[data-stack-marker]')];
  const rail = root.querySelector<HTMLElement>('[data-stack-rail]');
  const head = root.querySelector<HTMLElement>('[data-stack-head]');
  // From lg the whole intro column pins instead (CSS).
  const wide = window.matchMedia('(min-width: 64rem)');
  if (!list || cards.length < 2) return;

  let height = 0;
  let gap = 0;
  let frame = 0;

  root.dataset.stacked = '';

  /** Where each card sticks, from the top of the viewport. */
  const stickAt = () => cards.map((card) => parseFloat(getComputedStyle(card).top) || 0);

  /** Where the pinned heading ends (its margin box), from the top of the viewport. */
  function headEnd() {
    const style = getComputedStyle(head!);
    return parseFloat(style.top) + head!.offsetHeight + parseFloat(style.marginBottom);
  }

  function measure() {
    // The rows are equal (auto-rows-fr), so the first card's height is every card's.
    height = cards[0].offsetHeight;
    gap = parseFloat(getComputedStyle(list!).rowGap) || 0;
    root.style.setProperty('--stack-height', `${height}px`);
    pinHead();
    settle();
  }

  /** Sizes that follow where things stick; again once the header has come or gone. */
  function settle() {
    const tops = stickAt();
    root.style.setProperty('--stack-span', `${tops.at(-1)! - tops[0] + height}px`);
    // The pinned heading's room ends where the deck's does, so they leave together.
    if (root.hasAttribute('data-pinned')) {
      const release = Math.max(tops.at(-1)! + height - headEnd(), 0);
      root.style.setProperty('--stack-release', `${release}px`);
    } else root.style.removeProperty('--stack-release');
    update();
  }

  function setPinned(pinned: boolean) {
    root.toggleAttribute('data-pinned', pinned);
    if (pinned) root.style.setProperty('--stack-head', `${head!.offsetHeight}px`);
    else root.style.removeProperty('--stack-head');
  }

  /**
   * Pins the heading below lg. On a short screen the cards stick higher and tuck under it; that's
   * fine for their image, but if it would hide some of their text the heading scrolls away instead.
   */
  function pinHead() {
    if (!head) return;
    setPinned(!wide.matches);
    if (wide.matches) return;
    const media = cards[0].querySelector<HTMLElement>('[data-stack-media]')?.offsetHeight ?? 0;
    if (headEnd() - stickAt()[0] > media) setPinned(false);
  }

  function update() {
    frame = 0;
    const tops = stickAt();
    const listTop = list!.getBoundingClientRect().top;
    // How far each card has slid over the one before it: 0 as it reaches it, 1 once it sticks.
    // A card's place in the list (not where it sticks) tells how far the page has moved it.
    const landed = cards.map((_, index) => {
      if (index === 0) return 1;
      const position = listTop + index * (height + gap);
      const reach = tops[index - 1] + height;
      return Math.min(Math.max((reach - position) / (reach - tops[index]), 0), 1);
    });

    // A card sinks one step for each card that has landed on top of it.
    let depth = 0;
    for (let index = cards.length - 1; index >= 0; index--) {
      cards[index].style.setProperty('--stack-depth', depth.toFixed(3));
      depth += landed[index];
    }

    const current = landed.findLastIndex((amount) => amount >= LANDED);
    markers.forEach((marker, index) => {
      marker.toggleAttribute('data-reached', index <= current);
      marker.toggleAttribute('data-current', index === current);
    });
    const progress = (depth - 1) / (cards.length - 1);
    rail?.style.setProperty('--stack-progress', progress.toFixed(3));
  }

  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };

  // Only follow the scroll while the section is near the screen.
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) window.addEventListener('scroll', schedule, { passive: true });
      else window.removeEventListener('scroll', schedule);
      schedule();
    },
    { rootMargin: '50% 0px' },
  ).observe(root);

  // Card height changes with the width and once the font has loaded; `top` with the window.
  new ResizeObserver(measure).observe(cards[0]);
  window.addEventListener('resize', measure);

  // The header coming or going moves where things stick: at once, or after the glide.
  const header = document.querySelector('[data-header]');
  if (header) {
    new MutationObserver(() => requestAnimationFrame(settle)).observe(header, {
      attributeFilter: ['data-hidden'],
    });
  }
  root.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'top') settle();
  });
}

for (const root of document.querySelectorAll<HTMLElement>('[data-stack]')) setupStack(root);
