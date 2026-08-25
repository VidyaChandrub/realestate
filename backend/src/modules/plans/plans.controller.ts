import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';

@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list(@Query() query: ListPlansQueryDto) {
    return this.plansService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getById(@Param('id') id: string) {
    return this.plansService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HttpCode(200)
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}

@Controller('plans')
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  listPublic(@Query() query: ListPlansQueryDto) {
    // Public for registration — only active plans
    return this.plansService.list({ ...query, isActive: true } as any);
  }
}
