import { Injectable } from '@nestjs/common';
import { AdsService } from '../../ads/services/ads.service';
import { EventsService } from '../../events/services/events.service';
import { JobsService } from '../../jobs/services/jobs.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class MasterDataReferenceService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly eventsService: EventsService,
    private readonly adsService: AdsService,
    private readonly userService: UserService,
  ) {}

  async countActiveReferences(masterDataId: string): Promise<number> {
    const [jobs, events, ads, users] = await Promise.all([
      this.jobsService.countByMasterDataId(masterDataId),
      this.eventsService.countByMasterDataId(masterDataId),
      this.adsService.countByMasterDataId(masterDataId),
      this.userService.countByMasterDataId(masterDataId),
    ]);

    return jobs + events + ads + users;
  }
}
