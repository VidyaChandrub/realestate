import {
  Controller,
  Get,
  Header,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ListOthersSpecializationsDto } from './dto/list-others-specializations.dto';
import { PaginatedOthersSpecializationReportDto } from './dto/paginated-others-specialization-report.dto';
import { SyncOthersSpecializationsResponseDto } from './dto/sync-others-specializations-response.dto';
import { SyncStatusDto } from './dto/sync-status.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('others-specializations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List custom specializations submitted through OTHERS' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for custom specialization values' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size', example: 20 })
  @ApiResponse({ status: 200, type: PaginatedOthersSpecializationReportDto })
  async getOthersSpecializations(
    @Query() query: ListOthersSpecializationsDto,
  ): Promise<PaginatedOthersSpecializationReportDto> {
    return this.reportsService.getOthersSpecializationsReport(query);
  }

  @Get('others-specializations/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export custom specializations report as CSV' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for custom specialization values' })
  @ApiResponse({
    status: 200,
    description: 'CSV export of others specializations',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="others-specializations.csv"')
  async exportOthersSpecializations(
    @Query() query: ListOthersSpecializationsDto,
  ): Promise<string> {
    return this.reportsService.exportOthersSpecializationsCsv(query.search);
  }

  @Post('others-specializations/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Synchronize imported specializations with user education records',
    description: 'Updates education records where specialization=OTHERS to match newly imported master data specializations',
  })
  @ApiResponse({
    status: 200,
    type: SyncOthersSpecializationsResponseDto,
    description: 'Synchronization completed successfully',
  })
  async syncImportedSpecializations(): Promise<{
    success: true;
    message: string;
    data: SyncOthersSpecializationsResponseDto;
  }> {
    const response = await this.reportsService.syncImportedSpecializations();

    const message =
      response.updatedCount === 1
        ? '1 user education record synchronized successfully'
        : `${response.updatedCount} user education records synchronized successfully`;

    return {
      success: true,
      message,
      data: response,
    };
  }

  @Get('others-specializations/sync-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get latest Others Specializations sync status',
    description: 'Returns the timestamp and record count of the most recent specialization sync operation',
  })
  @ApiResponse({
    status: 200,
    type: SyncStatusDto,
    description: 'Current synchronization status',
  })
  async getSyncStatus(): Promise<{
    success: true;
    data: SyncStatusDto;
  }> {
    const data = await this.reportsService.getSyncStatus();
    return {
      success: true,
      data,
    };
  }
}
