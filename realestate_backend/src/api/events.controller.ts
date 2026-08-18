// src/api/events.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsService } from '../events/services/events.service';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { UpdateEventDto } from '../events/dto/update-event.dto';
import { ListEventsDto } from '../events/dto/list-events.dto';
import { ListRegistrationsDto } from '../events/dto/list-registrations.dto';
import { EventResponseDto, PaginatedEventsResponseDto } from '../events/dto/event-response.dto';

@ApiTags('Events')
@Controller('api/v1/events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    // ──────────────────────────────────────────────────────────────────────────
    // CREATE — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Create a new event draft (employer only)' })
    @ApiResponse({ status: 201, type: EventResponseDto, description: 'Event draft created' })
    @ApiResponse({ status: 403, description: 'Forbidden — not a member of the organization' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Body() dto: CreateEventDto,
        @Query('organizationId', ParseUUIDPipe) organizationId: string,
        @Request() req,
    ) {
        return this.eventsService.createEvent(dto, organizationId, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPDATE DRAFT — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Update a draft event (employer only)' })
    @ApiResponse({ status: 200, type: EventResponseDto })
    @ApiResponse({ status: 400, description: 'Event is not in DRAFT state' })
    @ApiResponse({ status: 404, description: 'Event not found' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateEventDto,
        @Request() req,
    ) {
        return this.eventsService.updateEvent(id, dto, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLISH — employer only | DRAFT → ACTIVE
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Publish an event (DRAFT → ACTIVE) (employer only)' })
    @ApiResponse({ status: 200, type: EventResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid state transition or missing required fields' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id/publish')
    async publish(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.eventsService.publishEvent(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL — employer only | DRAFT/ACTIVE → CANCELLED
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Cancel an event (employer only)' })
    @ApiResponse({ status: 200, type: EventResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid state transition' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id/cancel')
    async cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.eventsService.cancelEvent(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET ONE — public
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Get event by ID (public)' })
    @ApiResponse({ status: 200, type: EventResponseDto })
    @ApiResponse({ status: 404, description: 'Event not found' })
    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.eventsService.findOne(id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST — public
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'List events with pagination and filtering (public)' })
    @ApiResponse({ status: 200, type: PaginatedEventsResponseDto })
    @Get()
    async findAll(@Query() query: ListEventsDto): Promise<PaginatedEventsResponseDto> {
        const { events, total } = await this.eventsService.findAll(query);
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 100, 100);
        return {
            events: events as any,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REGISTER — authenticated user (internal events only)
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Register for an event (internal events only)' })
    @ApiResponse({ status: 201, description: 'Successfully registered' })
    @ApiResponse({ status: 409, description: 'Already registered or capacity exceeded' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(':id/register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.eventsService.registerForEvent(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL REGISTRATION — authenticated user
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Cancel your event registration' })
    @ApiResponse({ status: 200, description: 'Registration cancelled' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete(':id/register')
    async cancelRegistration(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.eventsService.cancelRegistration(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET REGISTRATIONS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'List all registrations for an event (employer only)' })
    @ApiResponse({ status: 200, description: 'Paginated list of registrations' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(':id/registrations')
    async getRegistrations(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: ListRegistrationsDto,
        @Request() req,
    ) {
        return this.eventsService.getRegistrations(id, req.user.userId, query);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST REGISTRATIONS FOR CURRENT USER — authenticated
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'List events the authenticated user is registered for' })
    @ApiResponse({ status: 200, description: 'Paginated list of registrations' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('registrations/me')
    async getMyRegistrations(@Query() query: ListRegistrationsDto, @Request() req) {
        return this.eventsService.getRegistrationsForUser(req.user.userId, query);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACK EXTERNAL CLICK — authenticated user
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Track a click on an external registration link (authenticated user)' })
    @ApiResponse({ status: 204, description: 'Click recorded' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(':id/track-external-click')
    @HttpCode(HttpStatus.NO_CONTENT)
    async trackExternalClick(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
        await this.eventsService.trackExternalClick(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET EXTERNAL CLICKS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'List users who clicked external registration link (employer only)' })
    @ApiResponse({ status: 200, description: 'Paginated list of external clicks' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(':id/external-clicks')
    async getExternalClicks(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: ListRegistrationsDto,
        @Request() req,
    ) {
        return this.eventsService.getExternalClicks(id, req.user.userId, query);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // MARK ATTENDANCE — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @ApiOperation({ summary: 'Mark a registrant as attended (employer only)' })
    @ApiParam({ name: 'userId', description: 'Keycloak user ID of the attendee' })
    @ApiResponse({ status: 200, description: 'Attendance marked' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id/registrations/:userId/attendance')
    async markAttendance(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('userId') userId: string,
        @Request() req,
    ) {
        return this.eventsService.markAttendance(id, userId, req.user.userId);
    }
  @ApiOperation({ summary: 'Delete an event (employer only)' })
  @ApiResponse({ status: 204, description: 'Event deleted' })
  @ApiResponse({
    status: 400,
    description: 'Only DRAFT or CANCELLED events can be deleted',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.eventsService.deleteEvent(id, req.user.userId);
  }
}
