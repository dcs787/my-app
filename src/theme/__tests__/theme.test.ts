import brand from '../../../replica/brand.json';
import { fontFamily, tokens, typeStyle } from '..';

describe('theme', () => {
  it('maps weights to Inter families', () => {
    expect(fontFamily('700')).toBe('Inter_700Bold');
    expect(fontFamily(400)).toBe('Inter_400Regular');
    expect(fontFamily('950')).toBe('Inter_400Regular');
  });

  it('builds a text style from a type role', () => {
    expect(typeStyle('title')).toEqual({ fontSize: 20, lineHeight: 25, fontFamily: 'Inter_600SemiBold' });
  });

  it('never ships the reference app brand colours listed in replica/brand.json', () => {
    const banned = brand.colors.map((c) => c.toLowerCase());
    expect(banned.length).toBeGreaterThan(0);
    const ours = Object.values(tokens.colors).map((c) => c.toLowerCase());
    banned.forEach((c) => expect(ours).not.toContain(c));
  });
});
