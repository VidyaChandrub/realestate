import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  buildOrganisationUpdateData,
  toSafeOrganisation,
} from '../../common/utils/mappers.util';
import { UpdateOrganisationDto } from '../admin-organisations/dto/update-organisation.dto';

@Injectable()
export class OrgSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(orgId: string) {
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: orgId },
    });
    return toSafeOrganisation(organisation);
  }

  async updateSettings(orgId: string, dto: UpdateOrganisationDto) {
    // slug and status are excluded from UpdateOrganisationDto entirely — an
    // Org Admin can never touch either, matching the mockup (slug shown
    // read-only, status is Super-Admin-only via its own endpoint).
    const updated = await this.prisma.organisation.update({
      where: { id: orgId },
      data: buildOrganisationUpdateData(dto),
    });
    return toSafeOrganisation(updated);
  }
}
