/**
 * Temporary palette playground.
 *
 * Change ACTIVE_PALETTE to try a preset. The values override the existing
 * semantic Tailwind colour tokens, so components do not need to change.
 */
export const PALETTES = {
  coral: {
    label: 'Coral & warm ivory',
    colors: {
      '--color-coral': '#EA8878',
      '--color-coral-tint': '#FBE3DE',
      '--color-ink': '#100420',
      '--color-text-muted': '#707070',
      '--color-surface': '#FCF8F4',
      '--color-bg': '#FFFFFF',
      '--color-placeholder': '#EEEEEE',
      '--color-footer': '#1A1A20',
      '--color-on-dark': '#FFFFFF',
    },
  },
  sage: {
    label: 'Sage & soft cream',
    colors: {
      '--color-coral': '#9DB59A',
      '--color-coral-tint': '#E7EFE5',
      '--color-ink': '#16231B',
      '--color-text-muted': '#5E6B61',
      '--color-surface': '#F5F8F3',
      '--color-bg': '#FFFFFD',
      '--color-placeholder': '#E8ECE6',
      '--color-footer': '#18211B',
      '--color-on-dark': '#FFFFFF',
    },
  },
  clay: {
    label: 'Clay & porcelain',
    colors: {
      '--color-coral': '#C97A5B',
      '--color-coral-tint': '#F5DDD2',
      '--color-ink': '#28140F',
      '--color-text-muted': '#6F625D',
      '--color-surface': '#FBF5F1',
      '--color-bg': '#FFFDFC',
      '--color-placeholder': '#EEE7E2',
      '--color-footer': '#241A17',
      '--color-on-dark': '#FFFFFF',
    },
  },
  lavender: {
    label: 'Lavender & pearl',
    colors: {
      '--color-coral': '#B09BCF',
      '--color-coral-tint': '#EDE6F5',
      '--color-ink': '#21152F',
      '--color-text-muted': '#675F6E',
      '--color-surface': '#F8F5FB',
      '--color-bg': '#FFFFFF',
      '--color-placeholder': '#ECE8F0',
      '--color-footer': '#201A27',
      '--color-on-dark': '#FFFFFF',
    },
  },
  monochrome: {
    label: 'Monochrome',
    colors: {
      '--color-coral': '#A3A3A3',
      '--color-coral-tint': '#E7E7E7',
      '--color-ink': '#171717',
      '--color-text-muted': '#5F5F5F',
      '--color-surface': '#F5F5F5',
      '--color-bg': '#FFFFFF',
      '--color-placeholder': '#E5E5E5',
      '--color-footer': '#1F1F1F',
      '--color-on-dark': '#FFFFFF',
    },
  },
  coastal: {
    label: 'Coastal blue & mist',
    colors: {
      '--color-coral': '#78ABC2',
      '--color-coral-tint': '#DFEFF4',
      '--color-ink': '#10252E',
      '--color-text-muted': '#5D6B71',
      '--color-surface': '#F3F8FA',
      '--color-bg': '#FFFFFF',
      '--color-placeholder': '#E5ECEF',
      '--color-footer': '#152229',
      '--color-on-dark': '#FFFFFF',
    },
  },
  blush: {
    label: 'Blush & rosewood',
    colors: {
      '--color-coral': '#D594A4',
      '--color-coral-tint': '#F3DFE4',
      '--color-ink': '#2D1720',
      '--color-text-muted': '#716168',
      '--color-surface': '#FAF0F3',
      '--color-bg': '#FFFAFB',
      '--color-placeholder': '#EFE5E8',
      '--color-footer': '#27191F',
      '--color-on-dark': '#FFFFFF',
    },
  },
  parchment: {
    label: 'Ochre & parchment',
    colors: {
      '--color-coral': '#D6AE4A',
      '--color-coral-tint': '#F5EAC9',
      '--color-ink': '#251D0B',
      '--color-text-muted': '#70674F',
      '--color-surface': '#FBF5E7',
      '--color-bg': '#FFFDF6',
      '--color-placeholder': '#EEE8D9',
      '--color-footer': '#242016',
      '--color-on-dark': '#FFFFFF',
    },
  },
  night: {
    label: 'Night clinic',
    colors: {
      '--color-coral': '#A94F46',
      '--color-coral-tint': '#302322',
      '--color-ink': '#F4F6F5',
      '--color-text-muted': '#AEB4B5',
      '--color-surface': '#182128',
      '--color-bg': '#0E1418',
      '--color-placeholder': '#293238',
      '--color-footer': '#080D10',
      '--color-on-dark': '#F4F6F5',
    },
  },
} as const;

export type PaletteName = keyof typeof PALETTES;

// Sets the first visit; the development picker remembers subsequent choices in local storage.
export const ACTIVE_PALETTE: PaletteName = 'coral';
