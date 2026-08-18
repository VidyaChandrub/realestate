import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, Req,
  UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Cron } from '@nestjs/schedule';
import { AdvertisementsService } from '../ads/services/advertisements.service';
import { StorageService } from '../ads/services/storage.service';
import { CreateAdvertisementDto } from '../ads/dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from '../ads/dto/update-advertisement.dto';
import { AdvertisementClickDto } from '../ads/dto/advertisement-click.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

@Controller('/api/v1/advertisements')
export class AdvertisementsController {
  private readonly logger = new Logger(AdvertisementsController.name);

  constructor(
    private readonly advertisementsService: AdvertisementsService,
    private readonly storageService: StorageService,
  ) { }

  /**
   * Hourly job: set ACTIVE ads whose end date has passed to INACTIVE.
   */
  @Cron('0 0 * * * *')
  async deactivateCompletedAds(): Promise<void> {
    try {
      const count = await this.advertisementsService.deactivateCompletedAds();
      if (count > 0) {
        this.logger.log(`Deactivated ${count} completed advertisement(s).`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to deactivate completed advertisements',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateAdvertisementDto, @Req() req) {
    const targetingData = {
      countryIds: dto.countryIds,
      stateIds: dto.stateIds,
      cityIds: dto.cityIds,
      skillIds: dto.skillIds,
      experienceLevelIds: dto.experienceLevelIds,
      educationLevelIds: dto.educationLevelIds,
      specializationIds: dto.specializationIds,
      yearOfPassing: dto.yearOfPassing,
    };
    return this.advertisementsService.create(dto, req.user, targetingData);
  }

  /**
   * Upload an advertisement image to Cloudflare R2.
   * Accepts multipart/form-data with a single file field named "file".
   * Returns { url: string } on success.
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    try {
      const url = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'advertisements',
      );

      return { url };
    } catch (error) {
      this.logger.error(
        `Failed to upload advertisement image "${file.originalname}"`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException(
        'Failed to upload image. Please try again in a moment.',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query, @Req() req) {
    const { data, total } = await this.advertisementsService.findAll(query, req.user);
    return {
      success: true,
      data,
      total,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('visible')
  findVisible(@Req() req) {
    return this.advertisementsService.findVisible(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advertisementsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvertisementDto, @Req() req) {
    return this.advertisementsService.update(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.advertisementsService.remove(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: any, @Req() req) {
    return this.advertisementsService.updateStatus(id, status, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/click')
  trackClick(@Param('id') id: string, @Body() dto: AdvertisementClickDto, @Req() req) {
    return this.advertisementsService.trackClick(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/clicks')
  getClicks(@Param('id') id: string, @Query() query) {
    return this.advertisementsService.getClicks(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/clicks/export')
  exportClicks(@Param('id') id: string, @Query() query) {
    return this.advertisementsService.exportClicks(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/clone')
  clone(@Param('id') id: string, @Req() req) {
    return this.advertisementsService.clone(id, req.user);
  }
}
