/**
 * Split a label into words of graphemes, indexed across the whole string so a roll can stagger
 * from the start (Greek accents and other combining marks stay one letter).
 */
export function rollLetters(text: string): { char: string; index: number }[][] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let index = 0;
  return text
    .split(' ')
    .map((word) =>
      [...segmenter.segment(word)].map(({ segment }) => ({ char: segment, index: index++ })),
    );
}
