import { BadRequestException, Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ContentService } from '../content/content.service';
import { ContentPageType } from '@prisma/client';
import { UpdateContentDto } from '../content/dto/update-content.dto';

function resolveContentType(value: string): ContentPageType {
  const normalized = value.toUpperCase().replace(/[-\s]/g, '_');
  const mapped = normalized === 'SUPPORT' ? 'HELP_SUPPORT' : normalized;
  if (!Object.values(ContentPageType).includes(mapped as ContentPageType)) {
    throw new BadRequestException(`Invalid content type: ${value}`);
  }
  return mapped as ContentPageType;
}

@Controller('api/v1/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':type')
  async getContent(@Param('type') type: string) {
    const resolvedType = resolveContentType(type);
    const data = await this.contentService.getContent(resolvedType);
    return { success: true, data };
  }

  @Patch(':type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async upsertContent(
    @Param('type') type: string,
    @Body() dto: UpdateContentDto,
  ) {
    const resolvedType = resolveContentType(type);
    const data = await this.contentService.upsertContent(resolvedType, dto.title, dto.body);
    return { success: true, data };
  }
}
