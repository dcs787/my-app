import { Skia, TextAlign, TextDirection, type SkParagraph, type SkTypeface, type SkTypefaceFontProvider } from '@shopify/react-native-skia';

import { isRtl } from '@/domain/script';

export { needsShaping } from '@/domain/script';

const providers = new WeakMap<SkTypeface, WeakMap<SkTypeface, SkTypefaceFontProvider>>();

function provider(face: SkTypeface, fallback?: SkTypeface): SkTypefaceFontProvider {
  const key = fallback ?? face;
  let inner = providers.get(face);
  if (!inner) providers.set(face, (inner = new WeakMap()));
  let p = inner.get(key);
  if (!p) {
    p = Skia.TypefaceFontProvider.Make();
    p.registerFont(face, 'sticker');
    if (fallback) p.registerFont(fallback, 'fallback');
    inner.set(key, p);
  }
  return p;
}

function build(text: string, face: SkTypeface, fallback: SkTypeface | undefined, size: number, colour: string): SkParagraph {
  const p = Skia.ParagraphBuilder.Make(
    { textDirection: isRtl(text) ? TextDirection.RTL : TextDirection.LTR, textAlign: TextAlign.Left, maxLines: 1 },
    provider(face, fallback),
  )
    .pushStyle({ fontFamilies: ['sticker', 'fallback'], fontSize: size, color: Skia.Color(colour) })
    .addText(text)
    .build();
  p.layout(100_000);
  return p;
}

/**
 * One line of shaped text, shrunk to fit `maxWidth` like the plain text
 * shapes. Returns the paragraph laid out at its own width, and where its
 * top sits relative to the baseline.
 */
export function shapedLine(
  text: string,
  face: SkTypeface,
  fallback: SkTypeface | undefined,
  size: number,
  colour: string,
  maxWidth?: number,
): { paragraph: SkParagraph; width: number; baseline: number } {
  let p = build(text, face, fallback, size, colour);
  let width = p.getLongestLine();
  if (maxWidth && width > maxWidth) {
    p = build(text, face, fallback, (size * maxWidth) / width, colour);
    width = p.getLongestLine();
  }
  p.layout(Math.ceil(width) + 1);
  const baseline = p.getLineMetrics()[0]?.baseline ?? size;
  return { paragraph: p, width, baseline };
}
