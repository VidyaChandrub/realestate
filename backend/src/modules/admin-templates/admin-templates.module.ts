import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminTemplatesController,
  PublicTemplatesController,
} from './admin-templates.controller';
import { AdminTemplatesService } from './admin-templates.service';
import {
  AdminTemplateCategoriesController,
  PublicTemplateCategoriesController,
} from './template-categories.controller';
import { TemplateCategoriesService } from './template-categories.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminTemplatesController,
    PublicTemplatesController,
    AdminTemplateCategoriesController,
    PublicTemplateCategoriesController,
  ],
  providers: [AdminTemplatesService, TemplateCategoriesService],
  exports: [AdminTemplatesService, TemplateCategoriesService],
})
export class AdminTemplatesModule {}
