import type { RichKind } from './plan.ts';

/**
 * Rich text fields (EmDash's Portable Text) for the two kinds of content that are text with
 * structure: a profile story (paragraphs, optional subheadings) and the body of a legal section
 * (paragraphs, subheadings, bulleted lists and runs of lines with links, like an address). Each
 * converts to the editor's blocks and back to the shape the site renders (schemas.ts). Formatting
 * the site doesn't render (bold, italics) is dropped on the way back.
 */

interface Span {
  _type: 'span';
  _key: string;
  text: string;
  marks?: string[];
}

interface LinkDef {
  _type: string;
  _key: string;
  href?: string;
}

interface Block {
  _type: 'block';
  _key: string;
  style?: string;
  listItem?: string;
  level?: number;
  children: Span[];
  markDefs?: LinkDef[];
}

type Link = { label: string; href: string };
type Run = string | Link;
type Line = Run | Run[];

type Paragraph = string | { heading: string };
type LegalBlock = string | { heading: string } | { list: string[] } | { lines: (Run | Run[])[] };

const HEADING = 'h3';

function block(key: string, children: Span[], extra: Partial<Block> = {}): Block {
  return { _type: 'block', _key: key, style: 'normal', markDefs: [], children, ...extra };
}

function span(key: string, text: string, marks: string[] = []): Span {
  return { _type: 'span', _key: key, text, marks };
}

const isHeading = (value: Block) => /^h[1-6]$/.test(value.style ?? '');
const textOf = (value: Block) => value.children.map((child) => child.text ?? '').join('');

function blocksOf(value: unknown): Block[] {
  return Array.isArray(value)
    ? value.filter((item): item is Block => item?._type === 'block' && Array.isArray(item.children))
    : [];
}

function encodeParagraphs(items: Paragraph[]): Block[] {
  return items.map((item, index) =>
    typeof item === 'string'
      ? block(`p${index}`, [span(`p${index}s`, item)])
      : block(`p${index}`, [span(`p${index}s`, item.heading)], { style: HEADING }),
  );
}

function decodeParagraphs(value: unknown): Paragraph[] {
  return blocksOf(value).map((item) =>
    isHeading(item) ? { heading: textOf(item) } : textOf(item),
  );
}

/** A run of lines as one paragraph: lines end in "\n", links are link marks. */
function encodeLines(key: string, lines: Line[]): Block {
  const children: Span[] = [];
  const markDefs: LinkDef[] = [];
  lines.forEach((line, lineIndex) => {
    const runs = Array.isArray(line) ? [...line] : [line];
    if (lineIndex > 0) runs.unshift('\n');
    for (const run of runs) {
      const spanKey = `${key}s${children.length}`;
      if (typeof run === 'string') {
        const last = children.at(-1);
        if (last && !last.marks?.length) last.text += run;
        else children.push(span(spanKey, run));
      } else {
        const linkKey = `${key}l${markDefs.length}`;
        markDefs.push({ _type: 'link', _key: linkKey, href: run.href });
        children.push(span(spanKey, run.label, [linkKey]));
      }
    }
  });
  return block(key, children, { markDefs });
}

/** A paragraph back to plain text, or to lines when it has links or line breaks. */
function decodeLines(value: Block): LegalBlock {
  const links = new Map(
    (value.markDefs ?? [])
      .filter((def) => def._type === 'link' && typeof def.href === 'string')
      .map((def) => [def._key, def.href as string]),
  );
  const lines: Run[][] = [[]];
  for (const child of value.children) {
    const href = child.marks?.map((mark) => links.get(mark)).find(Boolean);
    if (href) {
      lines.at(-1)!.push({ label: child.text, href });
      continue;
    }
    child.text.split('\n').forEach((text, index) => {
      if (index > 0) lines.push([]);
      const line = lines.at(-1)!;
      const last = line.at(-1);
      if (typeof last === 'string') line[line.length - 1] = last + text;
      else if (text) line.push(text);
    });
  }
  if (lines.length === 1 && lines[0].every((run) => typeof run === 'string')) {
    return (lines[0] as string[]).join('');
  }
  return { lines: lines.map((line) => (line.length === 1 ? line[0] : line)) };
}

function encodeLegal(items: LegalBlock[]): Block[] {
  return items.flatMap((item, index): Block[] => {
    const key = `b${index}`;
    if (typeof item === 'string') return [block(key, [span(`${key}s`, item)])];
    if ('heading' in item) return [block(key, [span(`${key}s`, item.heading)], { style: HEADING })];
    if ('list' in item) {
      return item.list.map((text, itemIndex) =>
        block(`${key}i${itemIndex}`, [span(`${key}i${itemIndex}s`, text)], {
          listItem: 'bullet',
          level: 1,
        }),
      );
    }
    return [encodeLines(key, item.lines)];
  });
}

function decodeLegal(value: unknown): LegalBlock[] {
  const result: LegalBlock[] = [];
  for (const item of blocksOf(value)) {
    if (item.listItem) {
      const last = result.at(-1);
      if (last && typeof last === 'object' && 'list' in last) last.list.push(textOf(item));
      else result.push({ list: [textOf(item)] });
    } else if (isHeading(item)) {
      result.push({ heading: textOf(item) });
    } else {
      result.push(decodeLines(item));
    }
  }
  return result;
}

export const richCodecs: Record<
  RichKind,
  { encode: (value: never) => Block[]; decode: (value: unknown) => unknown[] }
> = {
  paragraphs: { encode: encodeParagraphs, decode: decodeParagraphs },
  legal: { encode: encodeLegal, decode: decodeLegal },
};
