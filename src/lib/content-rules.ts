/**
 * Copy that must never reach the site (CLAUDE.md, content rules). The build checks the rendered
 * pages against these (scripts/check-content.mjs); the CMS plugin checks each entry before it's
 * published, so an editor hears about it at once (cms/plugin.ts).
 */

export interface ContentRule {
  name: string;
  pattern: RegExp;
}

/** Rules for text: content fields and rendered pages alike. */
export const TEXT_RULES: ContentRule[] = [
  { name: 'TODO marker (missing content)', pattern: /TODO/ },
  { name: 'Lorem ipsum', pattern: /lorem ipsum/i },
  { name: 'Copy borrowed from another clinic', pattern: /Sheila de Liz|Hormone Online Clinic/i },
  {
    name: '"Endocrinologist": Dr. Wilden must never be called one',
    pattern: /endocrinolog|endokrinolog|ενδοκρινολόγ|эндокринолог/i,
  },
  { name: 'Brand written "Hormon Experten" (use Hormonexperten)', pattern: /Hormon Experten/i },
];

/** Rules only the rendered HTML can show. */
export const PAGE_RULES: ContentRule[] = [
  { name: 'Placeholder "Title"', pattern: />\s*Title\s*</ },
  { name: 'Grey image placeholder', pattern: /data-placeholder/ },
];

/**
 * Typographic quotes and apostrophes only: straight ones are typing slips. Each locale uses its
 * own marks (“ ” en, „ “ de, « » el and ru).
 */
export const STRAIGHT_QUOTE: ContentRule = {
  name: 'Straight quote (use ’ “ ” „ « »)',
  pattern: /["']/,
};
