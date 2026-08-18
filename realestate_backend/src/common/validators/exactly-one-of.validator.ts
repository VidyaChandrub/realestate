import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'exactlyOneOf', async: false })
class ExactlyOneOfConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const [properties] = args.constraints as [string[]];
    const target = args.object as Record<string, unknown>;

    const definedCount = properties.filter((property) => {
      const propertyValue = target[property];
      return (
        propertyValue !== undefined &&
        propertyValue !== null &&
        propertyValue !== ''
      );
    }).length;

    return definedCount === 1;
  }

  defaultMessage(args: ValidationArguments): string {
    const [properties] = args.constraints as [string[]];
    return `Exactly one of the following fields must be provided: ${properties.join(', ')}`;
  }
}

/**
 * Class-level "exactly one of" rule (e.g. `deviceId` XOR `token`).
 *
 * class-validator has no first-class class-level decorator API, so this is attached to a
 * dedicated property that carries no other decorators (see usage below). Attaching it directly
 * to one of the checked properties would make it inherit that property's own @IsOptional()/
 * @ValidateIf() gating and get skipped whenever that specific property is absent — which is
 * exactly the case this validator needs to catch.
 */
export function ExactlyOneOf(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'exactlyOneOf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [properties],
      validator: ExactlyOneOfConstraint,
    });
  };
}
