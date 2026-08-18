import { Application, ApplicationStatus } from '@prisma/client';

export class ApplicationEntity implements Application {
    id: string;
    jobId: string;
    userId: string;
    coverNote: string | null;
    status: ApplicationStatus;
    appliedAt: Date;
    updatedAt: Date;

    job_id?: string;
    job_name?: string;
    job_description?: string | null;

    user_id?: string;
    user_first_name?: string | null;
    user_last_name?: string | null;

    constructor(partial: Partial<ApplicationEntity>) {
        Object.assign(this, partial);
    }
}
