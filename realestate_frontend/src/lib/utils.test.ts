import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves tailwind conflicts — last class wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'end')).toBe('base end');
    expect(cn('a', true && 'b')).toBe('a b');
  });

  it('ignores undefined, null, and false', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('returns empty string when no arguments are passed', () => {
    expect(cn()).toBe('');
  });
});
