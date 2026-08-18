import { ConflictException } from '@nestjs/common';
import { MasterDataCategoryType } from '@prisma/client';

export class DuplicateSlugException extends ConflictException {
  constructor(type: MasterDataCategoryType, slug: string) {
    super(`Slug \"${slug}\" already exists for type ${type}`);
  }
}
