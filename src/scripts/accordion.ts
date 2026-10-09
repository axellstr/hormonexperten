const requiredItems = [...document.querySelectorAll<HTMLDetailsElement>('details[data-keep-open]')];

if (requiredItems.length > 0 && !requiredItems.some((details) => details.open)) {
  requiredItems[0].open = true;
}

for (const details of requiredItems) {
  const summary = details.querySelector<HTMLElement>(':scope > summary');
  const icon = summary?.querySelector<SVGElement>('[data-accordion-icon]');

  if (!summary) continue;

  const syncExpandedState = () => {
    if (details.open) {
      summary.setAttribute('aria-disabled', 'true');
    } else {
      summary.removeAttribute('aria-disabled');
    }
  };

  syncExpandedState();
  details.addEventListener('toggle', syncExpandedState);

  summary.addEventListener('click', (event) => {
    if (!details.open) return;

    event.preventDefault();

    if (!icon) return;

    icon.classList.remove('accordion-wiggle');
    requestAnimationFrame(() => icon.classList.add('accordion-wiggle'));
  });

  icon?.addEventListener('animationend', () => {
    icon.classList.remove('accordion-wiggle');
  });
}
