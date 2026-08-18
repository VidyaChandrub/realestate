import { ConflictException } from '@nestjs/common';

export class MasterDataInUseException extends ConflictException {
  constructor(slug: string, references: number) {
    super(`Cannot deactivate master data \"${slug}\" because it is used by ${references} active entities`);
  }
}
