import { NotFoundException } from '@nestjs/common';

export class AnalyticsResourceNotFoundException extends NotFoundException {
  constructor(resourceName: string, id: string) {
    super(`${resourceName} not found for ID: ${id}`);
  }
}
