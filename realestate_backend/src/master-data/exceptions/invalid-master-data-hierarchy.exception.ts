import { BadRequestException } from '@nestjs/common';

export class InvalidMasterDataHierarchyException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
