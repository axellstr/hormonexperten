/**
 * Header behaviour. Everything here is progressive enhancement: the menus are <details> and
 * work without JS, and the nav links have a plain hover background.
 *
 * Menus ([data-menu] <details>):
 *   - open and close with a transition: `data-closed` holds the closed look while the panel
 *     ([data-menu-panel]) animates, and `open` is only dropped once it has finished
 *   - [data-menu-hover] menus also open on mouse hover after a short rest, and close a moment after
 *     the pointer leaves, unless it is on its way to the panel
 *   - close on an outside click, a link click, Escape, or focus leaving them
 *   - the [data-menu-sheet] menu (mobile) is a full-screen sheet behind the header pill: it grows
 *     out of the pill and back into it, and the page behind it is inert while it's open
 *
 * Nav (the [data-nav-track] list): a pill ([data-nav-indicator]) slides to the hovered or
 * focused item and otherwise rests on the item whose section is on screen.
 *
 * Header ([data-header]): gets `data-scrolled` once the hero ([data-hero]) has scrolled up behind
 * it, or on pages without one once the page scrolls, for its outline. It moves up with the page
 * while scrolling down and springs back on the way up (`data-hidden` once fully out of view).
 */

export {};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menus = [...document.querySelectorAll<HTMLDetailsElement>('details[data-menu]')];

type PaletteOption = {
  name: string;
  label: string;
  colors: Record<string, string>;
};

const picker = document.querySelector<HTMLDetailsElement>('[data-palette-picker]');
const toggle = picker?.querySelector<HTMLElement>('[data-palette-toggle]');

if (picker && toggle) {
  const palettes = JSON.parse(picker.dataset.palettes ?? '[]') as PaletteOption[];
  const currentLabel = picker.querySelector<HTMLElement>('[data-palette-current]');
  const options = [...picker.querySelectorAll<HTMLButtonElement>('[data-palette-option]')];
  const storageKey = 'hormonexperten-palette';

  const applyPalette = (palette: PaletteOption) => {
    for (const [property, value] of Object.entries(palette.colors)) {
      document.documentElement.style.setProperty(property, value);
    }

    document.documentElement.dataset.palette = palette.name;
    picker.dataset.activePalette = palette.name;
    toggle.setAttribute('aria-label', `Choose colour palette. Current palette: ${palette.label}.`);
    toggle.title = palette.label;
    if (currentLabel) currentLabel.textContent = palette.label;

    for (const option of options) {
      const selected = option.dataset.paletteOption === palette.name;
      option.setAttribute('aria-pressed', String(selected));
      option.toggleAttribute('data-active', selected);
      const check = option.querySelector<HTMLElement>('[data-palette-check]');
      check?.toggleAttribute('hidden', !selected);
    }

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute('content', palette.colors['--color-surface']);
  };

  const saved = localStorage.getItem(storageKey);
  const initial =
    palettes.find((palette) => palette.name === saved) ??
    palettes.find((palette) => palette.name === picker.dataset.activePalette);
  if (initial) applyPalette(initial);

  for (const option of options) {
    option.addEventListener('click', () => {
      const palette = palettes.find(({ name }) => name === option.dataset.paletteOption);
      if (!palette) return;
      applyPalette(palette);
      localStorage.setItem(storageKey, palette.name);
      hide(picker);
      toggle.focus();
    });
  }
}

const isShown = (menu: HTMLDetailsElement) => menu.open && !menu.hasAttribute('data-closed');

// How long the pointer rests on a hover menu's trigger before it opens, how much longer it may wait
// for the menu's images if they aren't in yet, and how long the pointer may be away (and not
// heading for the panel) before it closes.
const openDelay = 80;
const imageWait = 250;
const closeDelay = 300;

type Point = { x: number; y: number };

/** Whether `p` lies in the triangle `abc`, edges included. */
function inTriangle(p: Point, a: Point, b: Point, c: Point) {
  const side = (from: Point, to: Point) =>
    (to.x - from.x) * (p.y - from.y) - (to.y - from.y) * (p.x - from.x);
  const [ab, bc, ca] = [side(a, b), side(b, c), side(c, a)];
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

const decoded = new WeakMap<HTMLImageElement, Promise<unknown>>();

/**
 * Fetch and decode a menu's lazy images ahead of opening, so they don't pop in; resolves once
 * they're ready to paint. Images inside a [data-warm-media] block are only fetched while that
 * media query matches (the sheet shows services as thumbnails on phones and as cards from lg,
 * never both).
 */
function warm(menu: HTMLDetailsElement) {
  const ready: Promise<unknown>[] = [];
  for (const img of menu.querySelectorAll<HTMLImageElement>('img')) {
    const media = img.closest<HTMLElement>('[data-warm-media]')?.dataset.warmMedia;
    if (media && !window.matchMedia(media).matches) continue;
    let decoding = decoded.get(img);
    if (!decoding) {
      img.loading = 'eager';
      const loaded = img.complete
        ? Promise.resolve()
        : new Promise((done) => {
            img.addEventListener(
              'load',
              () => {
                // In after the menu opened (a slow connection): fade it in rather than pop.
                if (menu.open && !reduceMotion.matches) {
                  img.animate(
                    { opacity: [0, 1] },
                    { duration: 300, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
                  );
                }
                done(undefined);
              },
              { once: true },
            );
            img.addEventListener('error', done, { once: true });
          });
      // A broken image is as ready as it will get.
      decoding = loaded.then(() => img.decode()).catch(() => {});
      decoded.set(img, decoding);
    }
    ready.push(decoding);
  }
  return Promise.all(ready);
}

/** Run `callback` once the page has loaded and the browser is idle. */
function whenSettled(callback: () => void) {
  const idle = () => {
    // Safari has no requestIdleCallback.
    if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, { timeout: 2000 });
    else window.setTimeout(callback, 200);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

/**
 * Point a sheet's collapsed clip at the header pill, so it grows out of it and back. Runs before
 * the sheet first renders: if it rendered unclipped first, that would be its starting shape.
 */
function fitSheet(menu: HTMLDetailsElement) {
  const panel = menu.querySelector<HTMLElement>('[data-menu-panel]');
  const pill = menu.closest<HTMLElement>('[data-header-bar]');
  if (!panel || !pill || !menu.hasAttribute('data-menu-sheet')) return;
  const box = pill.getBoundingClientRect();
  // The sheet is fixed to the viewport (scrollbar excluded).
  const { clientWidth, clientHeight } = document.documentElement;
  panel.style.setProperty('--pill-top', `${box.top}px`);
  panel.style.setProperty('--pill-right', `${clientWidth - box.right}px`);
  panel.style.setProperty('--pill-bottom', `${clientHeight - box.bottom}px`);
  panel.style.setProperty('--pill-left', `${box.left}px`);
  // The pill's real radius (9999px) wouldn't interpolate evenly; half its height is the same shape.
  panel.style.setProperty('--pill-radius', `${box.height / 2}px`);
}

function show(menu: HTMLDetailsElement) {
  if (isShown(menu)) return;
  for (const other of menus) if (other !== menu) hide(other);
  warm(menu);
  fitSheet(menu);
  menu.setAttribute('data-closed', '');
  menu.open = true;
  // Apply the closed look first so the panel transitions from it.
  void menu.offsetWidth;
  menu.removeAttribute('data-closed');
}

function hide(menu: HTMLDetailsElement) {
  if (!isShown(menu)) return;
  delete menu.dataset.via;
  fitSheet(menu);
  menu.setAttribute('data-closed', '');
  const panel = menu.querySelector<HTMLElement>('[data-menu-panel]');
  const finish = () => {
    // Reopened while closing: leave it open.
    if (!menu.hasAttribute('data-closed')) return;
    menu.open = false;
    menu.removeAttribute('data-closed');
  };
  const running = panel && !reduceMotion.matches ? panel.getAnimations({ subtree: true }) : [];
  if (running.length === 0) finish();
  else Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
}

for (const menu of menus) {
  const summary = menu.querySelector('summary');
  if (!summary) continue;

  summary.addEventListener('click', (event) => {
    event.preventDefault();
    if (!isShown(menu)) {
      show(menu);
      menu.dataset.via = 'click';
    } else if (menu.dataset.via === 'hover') {
      // Clicking a menu that hover opened keeps it open rather than closing it under the cursor.
      menu.dataset.via = 'click';
    } else {
      hide(menu);
    }
  });

  // The sheet stays open while focus moves around the header pill (logo, Book Now).
  const scope = menu.hasAttribute('data-menu-sheet') ? menu.closest('[data-header]') : menu;
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (next && !scope?.contains(next)) hide(menu);
  });

  if (!menu.hasAttribute('data-menu-hover')) continue;

  /*
   * Hover, with a mouse. Opening waits for the pointer to rest, so sweeping across the nav doesn't
   * flash the menu open. Leaving starts the close delay, but heading for the panel doesn't count:
   * the strip between the trigger and the panel counts as the trigger, and in the triangle from
   * where the pointer left to the panel's top edge every move restarts the delay, so a slow or
   * diagonal path to the far cards keeps it open. Back on the trigger while it fades out, it
   * turns straight round.
   */
  const panel = menu.querySelector<HTMLElement>('[data-menu-panel]');
  let timer: number | undefined;
  let hovering = false;
  let aim: ((event: PointerEvent) => void) | undefined;

  // Its images load once the page has settled, or when the pointer first comes to the header, so
  // even the first opening paints complete cards. Not while it's hidden (the nav on small screens).
  const prefetch = () => {
    if (menu.getClientRects().length > 0) warm(menu);
  };
  whenSettled(prefetch);
  menu.closest('[data-header]')?.addEventListener('pointerenter', prefetch, { once: true });

  const stopAiming = () => {
    if (aim) document.removeEventListener('pointermove', aim);
    aim = undefined;
  };
  const closeLater = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      stopAiming();
      // Clicked open in the meantime: that stays until dismissed.
      if (menu.dataset.via === 'hover') hide(menu);
    }, closeDelay);
  };

  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    stopAiming();
    window.clearTimeout(timer);
    const ready = warm(menu);
    const open = () => {
      if (!hovering || isShown(menu)) return;
      show(menu);
      menu.dataset.via = 'hover';
    };
    if (menu.open) return open();
    timer = window.setTimeout(() => {
      // The images are normally in by now; if not, give them a moment rather than open on blanks.
      const patience = new Promise((done) => window.setTimeout(done, imageWait));
      void Promise.race([ready, patience]).then(open);
    }, openDelay);
  });

  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = false;
    stopAiming();
    window.clearTimeout(timer);
    if (menu.dataset.via !== 'hover' || !panel) return;
    const trigger = summary.getBoundingClientRect();
    const target = panel.getBoundingClientRect();
    const exit = { x: event.clientX, y: event.clientY };
    const topLeft = { x: target.left, y: target.top };
    const topRight = { x: target.right, y: target.top };
    closeLater();
    aim = ({ clientX: x, clientY: y }) => {
      if (x >= trigger.left && x <= trigger.right && y >= trigger.bottom && y <= target.top) {
        window.clearTimeout(timer);
        timer = undefined;
      } else if (timer === undefined || inTriangle({ x, y }, exit, topLeft, topRight)) {
        closeLater();
      }
    };
    document.addEventListener('pointermove', aim);
  });
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  for (const menu of menus) {
    if (!menu.contains(target) || target.closest('a')) hide(menu);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const menu of menus) {
    if (!isShown(menu)) continue;
    const hadFocus = menu.contains(document.activeElement);
    hide(menu);
    if (hadFocus) menu.querySelector('summary')?.focus();
  }
});

// Sliding pill behind the nav items.
const track = document.querySelector<HTMLElement>('[data-nav-track]');
const indicator = document.querySelector<HTMLElement>('[data-nav-indicator]');
const bar = indicator?.closest<HTMLElement>('[data-header-bar]');

if (track && indicator && bar) {
  const items = [...track.querySelectorAll<HTMLElement>('[data-nav-item]')];
  let target: HTMLElement | null = null;
  let current: HTMLElement | null = null;

  const place = (item: HTMLElement | null) => {
    target = item;
    if (!item || item.offsetWidth === 0) {
      indicator.style.opacity = '0';
      return;
    }
    const box = item.getBoundingClientRect();
    const frame = bar.getBoundingClientRect();
    const rtl = getComputedStyle(bar).direction === 'rtl';
    // The pill is anchored at the bar's inline start; move it onto the item.
    const x = rtl ? box.right - frame.right : box.left - frame.left;
    const appearing = indicator.style.opacity !== '1';
    // Don't slide in from wherever the pill last was: appear in place.
    if (appearing) indicator.style.transitionProperty = 'opacity';
    indicator.style.translate = `${x}px ${box.top - frame.top}px`;
    indicator.style.width = `${box.width}px`;
    indicator.style.height = `${box.height}px`;
    indicator.style.opacity = '1';
    if (appearing) {
      void indicator.offsetWidth;
      indicator.style.transitionProperty = '';
    }
  };

  const rest = () => {
    const open = items.find((item) => {
      const menu = item.closest<HTMLDetailsElement>('details[data-menu]');
      return menu && isShown(menu);
    });
    place(open ?? current);
  };

  track.setAttribute('data-enhanced', '');
  for (const item of items) {
    item.addEventListener('pointerenter', () => place(item));
    item.addEventListener('focus', () => place(item));
  }
  track.addEventListener('pointerleave', rest);
  track.addEventListener('focusout', (event) => {
    if (!track.contains(event.relatedTarget as Node | null)) rest();
  });
  for (const menu of menus)
    menu.addEventListener('toggle', () => !track.matches(':hover') && rest());

  new ResizeObserver(() => place(target)).observe(track);

  // Scroll-spy: rest on the item whose section crosses the upper middle of the viewport.
  const sections = new Map<Element, HTMLElement>();
  for (const item of items) {
    const section = item.dataset.navItem && document.getElementById(item.dataset.navItem);
    const href = item.getAttribute('href');
    const samePage = !href || new URL(href, location.href).pathname === location.pathname;
    if (section && samePage) sections.set(section, item);
  }
  const onScreen = new Set<Element>();
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      const visibleSection = [...sections.keys()].find((section) => onScreen.has(section));
      current = visibleSection ? sections.get(visibleSection)! : null;
      if (!track.matches(':hover') && !track.contains(document.activeElement)) rest();
    },
    { rootMargin: '-35% 0px -60% 0px' },
  );
  for (const section of sections.keys()) spy.observe(section);
}

// Outline on the header bar once content scrolls behind it: past the hero, or any scroll without one.
const header = document.querySelector<HTMLElement>('[data-header]');
const hero = document.querySelector('[data-hero]');
const sentinel = document.querySelector('[data-header-sentinel]');
const edge = hero ?? sentinel;
if (header && edge) {
  new IntersectionObserver(
    ([entry]) => {
      header.toggleAttribute(
        'data-scrolled',
        !entry.isIntersecting && entry.boundingClientRect.top < 0,
      );
    },
    // The hero counts as gone once its bottom passes under the header, not the viewport's top.
    { rootMargin: hero ? `-${header.offsetHeight}px 0px 0px 0px` : '0px' },
  ).observe(edge);
}

// While the sheet is open only the header can be reached: the rest of the page is inert. It also
// closes when the window grows past the breakpoint that hides it.
const sheet = menus.find((menu) => menu.hasAttribute('data-menu-sheet'));
if (header && sheet) {
  sheet.addEventListener('toggle', () => {
    for (const element of document.body.children) {
      if (!element.contains(header)) (element as HTMLElement).inert = sheet.open;
    }
  });
  window.addEventListener('resize', () => {
    if (isShown(sheet) && !sheet.checkVisibility()) hide(sheet);
  });
}

// The header moves up with the page while scrolling down, px for px, so it travels with the
// content. Coming back is a gesture, not a drag: a short scroll up drops it in on a soft spring,
// fading and growing in slightly, from wherever it is. If a scroll stops with it partly out, it
// finishes the move to whichever end is nearer.
if (header) {
  let lastY = window.scrollY;
  // How far the header has moved up, from 0 (in place) to its height (out of view). While an
  // animation runs this is where it is heading.
  let offset = 0;
  let motion: Animation | null = null;
  // The grow-in runs on its own, without the spring's overshoot: the header spans the viewport,
  // so scaling it past 1 would push it wider than the page and flash a horizontal scrollbar.
  let growth: Animation | null = null;
  // Upward scroll since the last downward one; past `intent` it reveals the header.
  let upTravel = 0;
  const intent = 8;
  let ticking = false;
  let settleTimer: number | undefined;
  // In-page links scroll the page down; keep the header in place until they land.
  let anchoring = false;

  // A gently underdamped spring (about 3% overshoot), sampled for `linear()` easing.
  const spring = (() => {
    if (!CSS.supports('transition-timing-function', 'linear(0, 1)')) {
      return 'cubic-bezier(0.16, 1, 0.3, 1)';
    }
    const damping = 0.75;
    const frequency = 9.2;
    const damped = frequency * Math.sqrt(1 - damping ** 2);
    const points = Array.from({ length: 48 }, (_, index) => {
      const t = index / 47;
      const decay = Math.exp(-damping * frequency * t);
      const x =
        1 -
        decay * (Math.cos(damped * t) + ((damping * frequency) / damped) * Math.sin(damped * t));
      return index === 47 ? 1 : Math.round(x * 1000) / 1000;
    });
    return `linear(${points.join(', ')})`;
  })();

  // How far it moves to be fully out of view: its height plus the bar's 1px outline, which is a
  // ring drawn outside the box and would otherwise stay on screen as a line along the top.
  const travel = () => header.offsetHeight + 1;

  /** Fade as it leaves, to half at fully out. */
  const opacityAt = (at: number) => 1 - (0.5 * at) / travel();

  const paint = (at: number) => {
    header.style.translate = at ? `0 ${-at}px` : '';
    header.style.opacity = at ? String(opacityAt(at)) : '';
    header.toggleAttribute('data-hidden', at > 0 && at >= travel());
  };

  /** Where the header is on screen right now, mid-animation included. */
  const current = () => {
    if (!motion) return offset;
    const y = parseFloat(getComputedStyle(header).translate.split(' ')[1] ?? '0');
    return Number.isNaN(y) ? 0 : Math.max(-y, 0);
  };

  /** Stop any animation where it is, so following the scroll picks up from there. */
  const halt = () => {
    growth?.cancel();
    growth = null;
    if (!motion) return;
    offset = current();
    motion.cancel();
    motion = null;
    paint(offset);
  };

  const moveTo = (target: number) => {
    halt();
    const from = offset;
    offset = target;
    paint(target);
    if (from === target || reduceMotion.matches) return;
    const height = travel();
    const revealing = target < from;
    const easeOut = 'cubic-bezier(0.33, 1, 0.68, 1)';
    const duration = revealing ? 450 + (200 * from) / height : 240;
    motion = header.animate(
      [
        { translate: `0 ${-from}px`, opacity: opacityAt(from) },
        { translate: `0 ${-target}px`, opacity: opacityAt(target) },
      ],
      { duration, easing: revealing ? spring : easeOut },
    );
    // Grows in from just under full size as it arrives.
    if (revealing) {
      growth = header.animate(
        { scale: [String(1 - (0.02 * from) / height), '1'] },
        { duration, easing: easeOut },
      );
    }
    const running = motion;
    running.onfinish = () => {
      if (motion === running) motion = null;
    };
  };

  const show = () => {
    upTravel = 0;
    // Already in place or on its way there: don't restart the spring on every scroll frame.
    if (offset) moveTo(0);
  };

  const settle = () => {
    const height = travel();
    if (motion || offset === 0 || offset === height) return;
    // Near the top the header is still in its own place in the page: leave it there.
    if (window.scrollY < height) return;
    moveTo(offset > height / 2 ? height : 0);
  };

  const update = () => {
    ticking = false;
    // Clamp so iOS overscroll bounce doesn't read as a direction change.
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = Math.min(Math.max(window.scrollY, 0), max);
    const delta = y - lastY;
    lastY = y;

    const busy = anchoring || menus.some(isShown) || header.querySelector(':focus-visible');
    if (busy) return show();
    if (delta === 0) return;

    if (delta > 0) {
      upTravel = 0;
      halt();
      // Never more than the page has scrolled, so the top of the page never shows a gap.
      offset = Math.min(offset + delta, travel(), y);
      paint(offset);
    } else {
      upTravel -= delta;
      if (upTravel >= intent) show();
      else if (!motion && offset > y) paint((offset = y));
    }

    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 150);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  // Keyboard users tabbing back into a hidden header get it back.
  header.addEventListener('focusin', show);

  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || new URL(link.href).pathname !== location.pathname) return;
    anchoring = true;
    show();
    const done = () => {
      anchoring = false;
      lastY = window.scrollY;
    };
    // `scrollend` isn't everywhere yet; the timeout covers the rest.
    const timer = window.setTimeout(done, 1000);
    window.addEventListener('scrollend', () => (window.clearTimeout(timer), done()), {
      once: true,
    });
  });
}
