import { describe, expect, it } from 'vitest';

import { buildGeminiArgs, formatMessagesForCLI } from './google.js';

describe('formatMessagesForCLI', () => {
  it('serializes role-tagged sections', () => {
    const out = formatMessagesForCLI(
      [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
      'be helpful',
    );
    expect(out).toBe('[system]\nbe helpful\n\n[user]\nhi\n\n[assistant]\nhello');
  });

  it('omits system when no hint', () => {
    const out = formatMessagesForCLI([{ role: 'user', content: 'x' }]);
    expect(out).toBe('[user]\nx');
  });
});

describe('buildGeminiArgs', () => {
  it('includes prompt and model', () => {
    expect(buildGeminiArgs('hi', 'gemini-2.5-pro')).toEqual(['-p', 'hi', '-m', 'gemini-2.5-pro']);
  });

  it('omits model when empty', () => {
    expect(buildGeminiArgs('hi', '')).toEqual(['-p', 'hi']);
  });
});
