import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateLeadDto } from './update-lead.dto';

function fieldErrors(body: Record<string, unknown>, property: string) {
  const dto = plainToInstance(UpdateLeadDto, body);
  const errors = validateSync(dto, { whitelist: true });
  // `contact` errors nest one level down.
  const flat = errors.flatMap((e) =>
    e.property === 'contact' ? (e.children ?? []) : [e],
  );
  return flat.filter((e) => e.property === property);
}

describe('UpdateLeadDto — loose phone validation (lead edit page)', () => {
  describe.each([
    ['contact.phone', (v: unknown) => fieldErrors({ contact: { phone: v } }, 'phone')],
    ['altPhone', (v: unknown) => fieldErrors({ altPhone: v }, 'altPhone')],
    ['whatsapp', (v: unknown) => fieldErrors({ whatsapp: v }, 'whatsapp')],
  ])('%s', (_label, errs) => {
    it.each([
      ['8088285265'], // bare 10-digit (India)
      ['+91 98204 55127'], // spaces
      ['+971 50 123 4567'], // Gulf, with country code
      ['(212) 555-0142'], // US, parens + hyphen
      ['+1-202-555-0189'], // hyphen separators
      ['1234567'], // 7 digits — the floor
      ['123456789012345'], // 15 digits — the ceiling
    ])('accepts %s', (value) => {
      expect(errs(value)).toHaveLength(0);
    });

    it.each([
      ['80882852658789090bnbnh', 'letters'],
      ['123', 'too few digits'],
      ['1234567890123456', '16 digits — over the ceiling'],
      ['++919820455127', 'two leading +'],
      ['98204@55127', 'stray symbol'],
    ])('rejects %s (%s)', (value) => {
      expect(errs(value).length).toBeGreaterThan(0);
    });

    it('treats empty / absent as no phone (optional field)', () => {
      expect(errs(undefined)).toHaveLength(0);
      expect(errs('')).toHaveLength(0);
      expect(errs(null)).toHaveLength(0);
    });
  });
});
