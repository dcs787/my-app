/** Scripts that need shaping (joined letters) and run right to left: Hebrew, Arabic, Syriac, Thaana, N'Ko. */
const RTL_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
/** The first letter decides the direction, as on a phone's text field. */
const FIRST_STRONG = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]|[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Plain glyph drawing is fine for Latin text; these need Skia's paragraph shaper. */
export const needsShaping = (text: string) => RTL_SCRIPT.test(text);

export function isRtl(text: string): boolean {
  const m = FIRST_STRONG.exec(text);
  return !!m && RTL_SCRIPT.test(m[0]);
}
