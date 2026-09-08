import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateOrgUserDto } from './create-org-user.dto';
import { UpdateOrgUserDto } from './update-org-user.dto';

function createErrors(phoneNumber: unknown) {
  const dto = plainToInstance(CreateOrgUserDto, {
    firstName: 'Ananya',
    lastName: 'Sharma',
    email: 'ananya@company.test',
    role: 'sales',
    phoneNumber,
  });
  return validateSync(dto).filter((e) => e.property === 'phoneNumber');
}

function updateErrors(phoneNumber: unknown) {
  const dto = plainToInstance(UpdateOrgUserDto, { phoneNumber });
  return validateSync(dto).filter((e) => e.property === 'phoneNumber');
}

describe('Org user DTO — mobile number validation', () => {
  it.each([
    ['9825041200'],
    ['+919825041200'],
    ['123456789012345'], // exactly 15 digits
    ['+123456789012345'],
  ])('accepts %s', (value) => {
    expect(createErrors(value)).toHaveLength(0);
    expect(updateErrors(value)).toHaveLength(0);
  });

  it('requires a mobile number on create but allows omitting it on update', () => {
    expect(createErrors(undefined).length).toBeGreaterThan(0);
    expect(createErrors('').length).toBeGreaterThan(0);
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
