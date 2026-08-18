import { NotFoundException } from '@nestjs/common';

export class MasterDataNotFoundException extends NotFoundException {
  constructor(idOrSlug: string) {
    super(`Master data not found: ${idOrSlug}`);
  }
}
