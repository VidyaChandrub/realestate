import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminTypographySetsService } from './admin-typography-sets.service';
import { CreateTypographySetDto } from '../org-typography-sets/dto/create-typography-set.dto';
import { UpdateTypographySetDto } from '../org-typography-sets/dto/update-typography-set.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/typography-sets')
export class AdminTypographySetsController {
  constructor(private readonly service: AdminTypographySetsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateTypographySetDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTypographySetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

// Unauthenticated — mirrors PublicTemplatesController's pattern. The local
// preview route (/p/[slug], /p/host/[...host]) is genuinely public (no auth
// guard anywhere in that route) and needs to resolve global-scoped
// typography for a published template, so platform sets need a read path
// that doesn't require Super Admin auth. Platform typography tokens carry
// no sensitive data — same trust level as a published template's own
// content already being publicly readable via GET /templates/:id.
@Controller('typography-sets')
export class PublicTypographySetsController {
  constructor(private readonly service: AdminTypographySetsService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
