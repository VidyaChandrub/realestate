import { ConflictException, HttpStatus } from '@nestjs/common';

export class JobHasApplicationsException extends ConflictException {
    static readonly MESSAGE =
        'This job cannot be deleted because candidates have already applied. Close the job instead.';

    constructor(job: { id: string; title: string }) {
        // Passing an object body (instead of a string) to ConflictException replaces
        // the default response entirely, so statusCode/message must be set explicitly
        // here to keep the existing response shape while adding `job`.
        super({
            statusCode: HttpStatus.CONFLICT,
            message: JobHasApplicationsException.MESSAGE,
            job,
        });
    }
}
