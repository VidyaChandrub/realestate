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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('overview')
  overview() {
    return this.subscriptionsService.overview();
  }

  @Get()
  list(@Query() query: ListSubscriptionsQueryDto) {
    return this.subscriptionsService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.subscriptionsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
