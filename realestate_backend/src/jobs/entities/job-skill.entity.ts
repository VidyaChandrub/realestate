import { JobSkill } from '@prisma/client';

export class JobSkillEntity implements JobSkill {
    id: string;
    jobId: string;
    masterDataId: string | null;

    constructor(partial: Partial<JobSkillEntity>) {
        Object.assign(this, partial);
    }
}
