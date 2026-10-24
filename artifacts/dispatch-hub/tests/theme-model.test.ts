import assert from 'node:assert/strict';
import test from 'node:test';
import { cycleTheme, parseStoredTheme, shouldShowCatDecorations, THEMES, themeLabel } from '../src/components/dispatch/themeModel';

test('theme cycle follows light, dark, cyberpunk, cat, then light', () => {
  const sequence = THEMES.map((theme) => {
    const next = cycleTheme(theme);
    assert.equal(themeLabel(next), next === 'dark' ? 'night' : next);
    return next;
  });

  assert.deepEqual(sequence, ['dark', 'cyberpunk', 'cat', 'light']);
});

test('stored theme parsing accepts all supported modes and rejects invalid values', () => {
  for (const theme of THEMES) assert.equal(parseStoredTheme(theme), theme);
  assert.equal(parseStoredTheme(null), null);
  assert.equal(parseStoredTheme('sepia'), null);
  assert.equal(parseStoredTheme('DARK'), null);
});

test('cat decorations can layer over other themes while Cat mode keeps its original styling', () => {
  assert.equal(shouldShowCatDecorations('cyberpunk', true), true);
  assert.equal(shouldShowCatDecorations('dark', true), true);
  assert.equal(shouldShowCatDecorations('light', false), false);
  assert.equal(shouldShowCatDecorations('cat', false), true);
});
