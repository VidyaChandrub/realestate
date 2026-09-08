import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePlatformMemberDto } from './create-platform-member.dto';
import { UpdatePlatformMemberDto } from './update-platform-member.dto';

function createErrors(phoneNumber: unknown) {
  const dto = plainToInstance(CreatePlatformMemberDto, {
    firstName: 'Plat',
    lastName: 'Member',
    email: 'member@ipixxel.test',
    role: 'super_admin',
    phoneNumber,
  });
  return validateSync(dto).filter((e) => e.property === 'phoneNumber');
}

function updateErrors(phoneNumber: unknown) {
  const dto = plainToInstance(UpdatePlatformMemberDto, { phoneNumber });
  return validateSync(dto).filter((e) => e.property === 'phoneNumber');
}

describe('Platform member DTO — mobile number validation', () => {
  it.each([
    ['9825041200'],
    ['+919825041200'],
    ['123456789012345'], // exactly 15 digits
    ['+123456789012345'], // 15 digits with +
  ])('accepts %s', (value) => {
    expect(createErrors(value)).toHaveLength(0);
    expect(updateErrors(value)).toHaveLength(0);
  });

  it('accepts an omitted or empty mobile number', () => {
    expect(createErrors(undefined)).toHaveLength(0);
    expect(createErrors('')).toHaveLength(0);
    expect(updateErrors(undefined)).toHaveLength(0);
    expect(updateErrors('')).toHaveLength(0);
  });

  it.each([
    ['98250abcd1', 'contains letters'],
    ['98250 41200', 'contains a space'],
    ['+91-98250-41200', 'contains hyphens'],
    ['1234567890123456', '16 digits — over the limit'],
    ['+1234567890123456', '16 digits with +'],
  ])('rejects %s (%s)', (value) => {
    expect(createErrors(value).length).toBeGreaterThan(0);
    expect(updateErrors(value).length).toBeGreaterThan(0);
  });
});
