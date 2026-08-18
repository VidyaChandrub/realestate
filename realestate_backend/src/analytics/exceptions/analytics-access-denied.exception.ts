import { ForbiddenException } from '@nestjs/common';

export class AnalyticsAccessDeniedException extends ForbiddenException {
  constructor(message = 'You do not have access to this analytics resource') {
    super(message);
  }
}
