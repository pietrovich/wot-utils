import { describe, it, expect, vi } from 'vitest';
import { printJson } from '../src/lib/format.js';

describe('printJson', () => {
  it('outputs pretty-printed JSON to stdout', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const data = { key: 'value', num: 42 };
    printJson(data);
    expect(spy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    spy.mockRestore();
  });

  it('handles arrays', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printJson([1, 2, 3]);
    expect(spy).toHaveBeenCalledWith('[\n  1,\n  2,\n  3\n]');
    spy.mockRestore();
  });
});
