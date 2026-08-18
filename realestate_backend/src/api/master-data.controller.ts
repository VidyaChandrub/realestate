import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MasterDataCategoryType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateMasterDataDto } from '../master-data/dto/create-master-data.dto';
import { GetChildrenBySlugQueryDto } from '../master-data/dto/get-children-by-slug-query.dto';
import { GetBySlugQueryDto } from '../master-data/dto/get-by-slug-query.dto';
import { GetTreeQueryDto } from '../master-data/dto/get-tree-query.dto';
import { ListMasterDataDto } from '../master-data/dto/list-master-data.dto';
import { SearchCitiesQueryDto } from '../master-data/dto/search-cities-query.dto';
import { SearchMasterDataQueryDto } from '../master-data/dto/search-master-data-query.dto';
import { UpdateMasterDataDto } from '../master-data/dto/update-master-data.dto';
import {
  CitySearchResultEntity,
  MasterDataSearchResultEntity,
  MasterDataEntity,
  PaginatedMasterDataResponse,
} from '../master-data/entities/master-data.entity';
import { MasterDataTreeNodeEntity } from '../master-data/entities/master-data-tree-node.entity';
import { MasterDataService } from '../master-data/services/master-data.service';

@ApiTags('Master Data')
@Controller('api/v1/master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create master data entry (admin only)' })
  @ApiResponse({ status: 201, type: MasterDataEntity })
  async create(@Body() dto: CreateMasterDataDto): Promise<MasterDataEntity> {
    return this.masterDataService.create(dto);
  }

  @Post('upload-csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload and upsert master data from CSV (admin only)' })
  @ApiResponse({
    status: 201,
    schema: {
      type: 'object',
      properties: {
        totalRows: { type: 'number' },
        created: { type: 'number' },
        updated: { type: 'number' },
        skipped: { type: 'number' },
      },
    },
  })
  async uploadCsv(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ totalRows: number; created: number; updated: number; skipped: number }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('CSV file is required');
    }

    return this.masterDataService.uploadFromCsv(file.buffer.toString('utf-8'));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master data entry (admin only)' })
  @ApiResponse({ status: 200, type: MasterDataEntity })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMasterDataDto,
  ): Promise<MasterDataEntity> {
    return this.masterDataService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete master data entry (admin only)' })
  @ApiResponse({ status: 200, type: MasterDataEntity })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.masterDataService.hardDelete(id);
  }

  @Get()
  @ApiOperation({ summary: 'List master data (public)' })
  @ApiResponse({ status: 200, type: PaginatedMasterDataResponse })
  async findAll(@Query() query: ListMasterDataDto): Promise<PaginatedMasterDataResponse> {
    query.limit = Math.min(query.limit ?? 100, 100);
    return this.masterDataService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get master data hierarchy tree by type (public)' })
  @ApiQuery({ name: 'type', enum: MasterDataCategoryType })
  @ApiResponse({ status: 200, type: [MasterDataTreeNodeEntity] })
  async getTree(@Query() query: GetTreeQueryDto): Promise<MasterDataTreeNodeEntity[]> {
    return this.masterDataService.getTree(query.type);
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Get master data by type without nesting (public)' })
  @ApiQuery({ name: 'type', enum: MasterDataCategoryType })
  @ApiResponse({ status: 200, type: [MasterDataTreeNodeEntity] })
  async getByType(
    @Query() query: GetTreeQueryDto,
  ): Promise<MasterDataTreeNodeEntity[]> {
    return this.masterDataService.getByType(query.type);
  }

  @Get('search/cities')
  @ApiOperation({ summary: 'Search active city master data by value (public)' })
  @ApiQuery({
    name: 'value',
    required: true,
    description: 'Search term for LOCATION_CITY values. Minimum 1 characters.',
    minLength: 1,
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Optional parent state master data ID filter.',
  })
  @ApiResponse({ status: 200, type: [CitySearchResultEntity] })
  async searchCities(
    @Query() query: SearchCitiesQueryDto,
  ): Promise<CitySearchResultEntity[]> {
    return this.masterDataService.searchCities(query.value, query.parentId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search active master data by value across all types (public)' })
  @ApiQuery({
    name: 'value',
    required: true,
    description: 'Search term for master data values. Minimum 3 characters.',
    minLength: 1,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: MasterDataCategoryType,
    description: 'Optional master data type filter.',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Optional parent master data ID filter.',
  })
  @ApiResponse({ status: 200, type: [MasterDataSearchResultEntity] })
  async searchMasterData(
    @Query() query: SearchMasterDataQueryDto,
  ): Promise<MasterDataSearchResultEntity[]> {
    return this.masterDataService.search(query.value, query.type, query.parentId);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get master data by slug (public)' })
  @ApiParam({ name: 'slug', description: 'Master data slug' })
  @ApiQuery({ name: 'type', enum: MasterDataCategoryType, required: false })
  @ApiResponse({ status: 200, type: MasterDataEntity })
  async findBySlug(
    @Param('slug') slug: string,
    @Query() query: GetBySlugQueryDto,
  ): Promise<MasterDataEntity> {
    return this.masterDataService.findBySlug(slug, query.type);
  }

  @Get('by-slug/:slug/children')
  @ApiOperation({ summary: 'Get active child master data by parent slug (public)' })
  @ApiParam({ name: 'slug', description: 'Parent master data slug' })
  @ApiQuery({ name: 'childType', enum: MasterDataCategoryType, required: true })
  @ApiQuery({ name: 'type', enum: MasterDataCategoryType, required: false })
  @ApiResponse({ status: 200, type: [MasterDataEntity] })
  async findChildrenBySlug(
    @Param('slug') slug: string,
    @Query() query: GetChildrenBySlugQueryDto,
  ): Promise<MasterDataEntity[]> {
    return this.masterDataService.findChildrenBySlug(
      slug,
      query.childType,
      query.type,
    );
  }
  @Get('children')
  async getChildren(
    @Query('parentId') parentId: string,
    @Query('type') type: MasterDataCategoryType,
  ) {
    console.log('CHILDREN ENDPOINT HIT');

    return this.masterDataService.getChildrenByParentId(
      parentId,
      type,
    );
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get master data by ID (public)' })
  @ApiResponse({ status: 200, type: MasterDataEntity })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MasterDataEntity> {
    return this.masterDataService.findOne(id);
  }
}
