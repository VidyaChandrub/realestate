import { BadRequestException } from '@nestjs/common';
import { normalizeFieldTemplate } from './field-template.util';

describe('normalizeFieldTemplate', () => {
  it('generates keys from labels, keeps supplied keys and dedupes choices', () => {
    const out = normalizeFieldTemplate([
      { label: 'Total land', type: 'number', unit: ' acres ' },
      { key: 'soil', label: 'Soil', type: 'choice', options: ['Red', ' Red ', 'Black'], required: true },
    ]);
    expect(out).toEqual([
      { key: 'total_land', label: 'Total land', type: 'number', required: false, unit: 'acres' },
      { key: 'soil', label: 'Soil', type: 'choice', required: true, options: ['Red', 'Black'] },
    ]);
  });

  it('rejects malformed templates', () => {
    const bad = (v: unknown) =>
      expect(() => normalizeFieldTemplate(v)).toThrow(BadRequestException);
    bad('nope');
    bad([{ label: '', type: 'text' }]);
    bad([{ label: 'X', type: 'date' }]);
    bad([{ label: 'X', type: 'choice' }]);
    bad([{ label: 'A', type: 'text' }, { label: 'a', type: 'text' }]);
    bad([{ key: 'k', label: 'A', type: 'text' }, { key: 'k', label: 'B', type: 'text' }]);
    bad([{ key: 'Bad Key', label: 'A', type: 'text' }]);
  });

  it('drops options from non-choice fields and unit from non-number fields', () => {
    const [f] = normalizeFieldTemplate([
      { label: 'Corner', type: 'yesno', options: ['x'], unit: 'y' },
    ]);
    expect(f).toEqual({ key: 'corner', label: 'Corner', type: 'yesno', required: false });
  });
});
