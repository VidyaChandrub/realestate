import { describe, it, expect } from 'vitest';
import { getYearOptions } from './yearOptions';

describe('getYearOptions', () => {
  it('returns years in descending order', () => {
    const options = getYearOptions({ currentYear: 2024, startYear: 2022, futureYearLimit: 0 });
    expect(options.map((o) => o.value)).toEqual(['2024', '2023', '2022']);
  });

  it('returns the correct number of options', () => {
    const options = getYearOptions({ currentYear: 2024, startYear: 2020, futureYearLimit: 0 });
    expect(options).toHaveLength(5);
  });

  it('includes future years when futureYearLimit is set', () => {
    const options = getYearOptions({ currentYear: 2024, startYear: 2024, futureYearLimit: 2 });
    expect(options.map((o) => o.value)).toEqual(['2026', '2025', '2024']);
  });

  it('each option has matching id and value', () => {
    const options = getYearOptions({ currentYear: 2023, startYear: 2022, futureYearLimit: 0 });
    options.forEach((option) => {
      expect(option.id).toBe(option.value);
    });
  });

  it('returns an empty array when startYear is after endYear', () => {
    const options = getYearOptions({ currentYear: 2020, startYear: 2025, futureYearLimit: 0 });
    expect(options).toHaveLength(0);
  });

  it('returns a single option when startYear equals currentYear', () => {
    const options = getYearOptions({ currentYear: 2024, startYear: 2024, futureYearLimit: 0 });
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('2024');
  });
});
