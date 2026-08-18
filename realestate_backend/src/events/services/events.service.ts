// src/events/services/events.service.ts
import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    Event,
    EventStatus,
    EventRegistration,
    Prisma,
    RegistrationType,
    RegistrationStatus,
    MasterDataCategoryType,
    MasterStatus,
    NotificationType,
    EntityType,
} from '@prisma/client';
import { AnalyticsEventType } from '../../analytics/analytics.constants';

import { PrismaService } from '../prisma.service';
import { EventsRepository } from '../repositories/events.repository';
import { EventRegistrationsRepository } from '../repositories/event-registrations.repository';
import { EventExternalClicksRepository } from '../repositories/event-external-clicks.repository';
import { EmployerUsersService } from '../../employers/services/employer-users.service';
import { EmployersService } from '../../employers/services/employers.service';
import { UserService } from '../../user/user.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { ListEventsDto } from '../dto/list-events.dto';
import { ListRegistrationsDto } from '../dto/list-registrations.dto';

import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { UnauthorizedEventAccessException } from '../exceptions/unauthorized-event-access.exception';
import { InvalidEventStateException } from '../exceptions/invalid-event-state.exception';
import { EventCapacityExceededException } from '../exceptions/event-capacity-exceeded.exception';

type RelevantEventMatchRow = {
    id: string;
    similarityScore: number;
};

const UUID_TAG_PATTERN = /^[0-9a-fA-F-]{36}$/;

// ─── Valid state transitions ─────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
    [EventStatus.DRAFT]: [EventStatus.ACTIVE, EventStatus.CANCELLED],
    [EventStatus.ACTIVE]: [EventStatus.CANCELLED, EventStatus.COMPLETED],
    [EventStatus.CANCELLED]: [EventStatus.DRAFT, EventStatus.ACTIVE],
    [EventStatus.COMPLETED]: [], // terminal
};

export type EventTagResponse = {
    id: string;
    value: string | null;
};

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly eventsRepository: EventsRepository,
        private readonly registrationsRepository: EventRegistrationsRepository,
        private readonly externalClicksRepository: EventExternalClicksRepository,
        private readonly employerUsersService: EmployerUsersService,
        private readonly employersService: EmployersService,
        private readonly eventEmitter: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // ──────────────────────────────────────────────────────────────────────────
    // CREATE — only employer members of the org can create events
    // ──────────────────────────────────────────────────────────────────────────
    async createEvent(dto: CreateEventDto, organizationId: string, userId: string): Promise<any> {
        await this.assertOrgMembership(userId, organizationId);
        await this.validateSpecializationTags(dto.tagIds);

        const event = await this.eventsRepository.create({
            organization: { connect: { id: organizationId } },
            title: dto.title,
            description: dto.description,
            categoryId: dto.categoryId,
            mode: dto.mode,
            locationId: dto.locationId,
            meetingUrl: dto.meetingUrl,
            isMeetingUrlPublished: dto.isMeetingUrlPublished ?? false,
            registrationType: dto.registrationType,
            externalRegistrationUrl: dto.externalRegistrationUrl,
            capacity: dto.capacity,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            bannerImage: dto.bannerImage,
            tagIds: dto.tagIds ?? [],
            isFree: dto.isFree,
            price: dto.price ?? null,
            status: EventStatus.DRAFT,
        });

        await this.syncEventSearchData(event.id, {
            tagIds: event.tagIds,
            locationId: event.locationId,
        });

        this.logger.log(`Event created: ${event.id} by employer ${userId}`);
        this.eventEmitter.emit('event.created', event);
        return this.attachTagsToEvent(event);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPDATE — only allowed on DRAFT events by org members
    // ──────────────────────────────────────────────────────────────────────────
    async updateEvent(id: string, dto: UpdateEventDto, userId: string): Promise<any> {
        const event = await this.getEventOrThrow(id);
        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.assertOrgMembership(userId, event.organizationId);
        }

        this.assertStatus(event, [EventStatus.DRAFT, EventStatus.ACTIVE, EventStatus.CANCELLED], 'Only DRAFT, ACTIVE, and CANCELLED events can be updated');

        // Validate status transition only if the status is actually changing
        if (dto.status !== undefined && dto.status !== event.status) {
            this.assertTransition(event, dto.status);
        }
        await this.validateSpecializationTags(dto.tagIds);
        const updated = await this.eventsRepository.update(id, {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
            ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
            ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
            ...(dto.meetingUrl !== undefined ? { meetingUrl: dto.meetingUrl } : {}),
            ...(dto.isMeetingUrlPublished !== undefined
                ? { isMeetingUrlPublished: dto.isMeetingUrlPublished }
                : {}),
            ...(dto.registrationType !== undefined ? { registrationType: dto.registrationType } : {}),
            ...(dto.externalRegistrationUrl !== undefined
                ? { externalRegistrationUrl: dto.externalRegistrationUrl }
                : {}),
            ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
            ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
            ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
            ...(dto.bannerImage !== undefined ? { bannerImage: dto.bannerImage } : {}),
            ...(dto.tagIds !== undefined ? { tagIds: dto.tagIds } : {}),
            ...(dto.isFree !== undefined ? { isFree: dto.isFree } : {}),
            ...(dto.price !== undefined ? { price: dto.price } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
        });

        await this.syncEventSearchData(id, {
            tagIds: dto.tagIds ?? event.tagIds,
            locationId: dto.locationId ?? event.locationId,
        });

        this.logger.log(`Event updated: ${id}`);

        try {
            await this.notifyRegisteredUsersOfUpdate(event, updated);
        } catch (error) {
            this.logger.error(
                `Failed to notify users for event ${updated.id}`,
                (error as Error).stack,
            );
        }

        return this.attachTagsToEvent(updated);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLISH — DRAFT/CANCELLED → ACTIVE; validates required fields first
    // ──────────────────────────────────────────────────────────────────────────
    async publishEvent(id: string, userId: string): Promise<any> {
        const event = await this.getEventOrThrow(id);
        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.assertOrgMembership(userId, event.organizationId);
        }
        
        const isReactivation = event.status === EventStatus.CANCELLED;

        if (!isReactivation) {
            this.assertTransition(event, EventStatus.ACTIVE);
        }

        // Required fields validation before publishing
        if (!event.startDate || !event.endDate) {
            throw new InvalidEventStateException('Event must have startDate and endDate before publishing');
        }
        if (!event.title || event.title.trim().length === 0) {
            throw new InvalidEventStateException('Event must have a title before publishing');
        }
        if (event.mode === 'OFFLINE' && !event.locationId) {
            throw new InvalidEventStateException('OFFLINE events must have a locationId before publishing');
        }
        if (event.registrationType === RegistrationType.EXTERNAL && !event.externalRegistrationUrl) {
            throw new InvalidEventStateException(
                'EXTERNAL registration type requires an externalRegistrationUrl before publishing',
            );
        }

        const published = await this.eventsRepository.update(id, { status: EventStatus.ACTIVE });

        if (isReactivation) {
            await this.eventsRepository.reactivateAllRegistrations(id);
            this.logger.log(`Event reactivated, registrations restored: ${id}`);
        }

        this.logger.log(`Event published: ${id}`);
        this.eventEmitter.emit('event.published', published);
        return this.attachTagsToEvent(published);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL — DRAFT or ACTIVE → CANCELLED by org members
    // ──────────────────────────────────────────────────────────────────────────
    async cancelEvent(id: string, userId: string): Promise<any> {
        const event = await this.getEventOrThrow(id);
        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.assertOrgMembership(userId, event.organizationId);
        }

        this.assertTransition(event, EventStatus.CANCELLED);

        // Capture active registrations before they get cancelled below
        const registeredUserIds = await this.registrationsRepository.findRegisteredUserIds(id);

        const cancelled = await this.eventsRepository.update(id, {
            status: EventStatus.CANCELLED,
        });
        await this.eventsRepository.cancelAllRegistrations(id);
        this.logger.log(`Event cancelled: ${id}`);
        this.eventEmitter.emit('event.cancelled', cancelled);

        try {
            await this.notifyRegisteredUsersOfCancellation(cancelled, registeredUserIds);
        } catch (error) {
            this.logger.error(
                `Failed to notify users for event cancellation ${cancelled.id}`,
                (error as Error).stack,
            );
        }

        return this.attachTagsToEvent(cancelled);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC READ
    // ──────────────────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<any> {
    const event = await this.getEventOrThrow(id);

    const [registeredCount, externalClickCount] = await Promise.all([
      this.eventsRepository.countActiveRegistrations(id),
      event.registrationType === RegistrationType.EXTERNAL
        ? this.externalClicksRepository.countByEvent(id)
        : Promise.resolve(undefined),
    ]);

    return this.attachTagsToEvent({
      ...this.sanitizePublicEvent(event),
      registeredCount,
      ...(externalClickCount !== undefined && { externalClickCount }),
    });
  }

  async findAll(query: ListEventsDto): Promise<{ events: any[]; total: number }> {
    const { events, total } = await this.eventsRepository.findAll(query);

    const eventIds = events.map((event) => event.id);
    const externalEventIds = events
      .filter((e) => e.registrationType === RegistrationType.EXTERNAL)
      .map((e) => e.id);

    const [counts, externalClickCounts] = await Promise.all([
      eventIds.length
        ? this.prisma.eventRegistration.groupBy({
            by: ['eventId'],
            where: { eventId: { in: eventIds }, status: RegistrationStatus.REGISTERED },
            _count: { eventId: true },
          })
        : Promise.resolve([] as { eventId: string; _count: { eventId: number } }[]),
      this.externalClicksRepository.countsByEvents(externalEventIds),
    ]);

    const countMap = new Map(counts.map((count) => [count.eventId, count._count.eventId] as [string, number]));

    const eventsWithCount = events.map((event) => ({
      ...this.sanitizePublicEvent(event),
      registeredCount: countMap.get(event.id) || 0,
      ...(event.registrationType === RegistrationType.EXTERNAL && {
        externalClickCount: externalClickCounts.get(event.id) ?? 0,
      }),
    }));

    return { events: await this.attachTagsToEvents(eventsWithCount), total };
  }

  async getRelevantEvents(
    keycloakUser: any,
    params: {
      limit?: number;
      offset?: number;
      hideSeenFeeds?: boolean;
    } = {},
  ): Promise<Array<Event & { registeredCount: number; similarityScore: number }>> {
    await this.userService.findOrCreateProfile(keycloakUser);

    const userId = keycloakUser.userId;
    const normalizedLimit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const normalizedOffset = Math.max(params.offset ?? 0, 0);
    const now = new Date();

    // Excludes events the user has actually viewed (confirmed via
    // POST /api/v1/feed/impressions), not merely served in a prior response — an
    // item that was served but never looked at stays eligible to reappear.
    const seenClause = params.hideSeenFeeds
      ? Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM analytics.user_seen_feed usf
          WHERE usf.user_id = ${userId}
            AND usf.entity_id = e.id::uuid
            AND usf.entity_type = 'EVENT'
            AND usf.viewed_at IS NOT NULL
        )`
      : Prisma.empty;

    const profileRows = await this.prisma.$queryRaw<
      Array<{
        currentCityId: string | null;
        stateId: string | null;
        countryId: string | null;
        preferredLocationIds: string[] | null;
      }>
    >`
      SELECT
        p.current_city_id AS "currentCityId",
        p.state_id AS "stateId",
        p.country_id AS "countryId",
        (
          SELECT array_agg(upl.location_id)
          FROM "users"."user_preferred_locations" upl
          WHERE upl.profile_id = p.id
        ) AS "preferredLocationIds"
      FROM "users"."profiles" p
      WHERE p.user_id = ${userId}
      LIMIT 1
    `;
    const profileRow = profileRows[0];

    // Location: pass if the event is online, has no location set, or its location is
    // the user's city/state/country/preferred locations. If the user hasn't set ANY
    // location info at all, don't filter on location (incomplete profile = neutral,
    // not disqualifying) — same approach as JobsService.getRelevantJobs.
    const locationIds = [
      profileRow?.currentCityId,
      profileRow?.stateId,
      profileRow?.countryId,
      ...(profileRow?.preferredLocationIds ?? []),
    ].filter((id): id is string => Boolean(id));

    const locationClause = locationIds.length > 0
      ? Prisma.sql`AND (
          e.mode = 'ONLINE'::"events"."EventMode"
          OR e.location_id IS NULL
          OR e.location_id = ANY(${locationIds}::uuid[])
        )`
      : Prisma.empty;

    const matches = await this.prisma.$queryRaw<RelevantEventMatchRow[]>`
          SELECT e.id, 0::double precision AS "similarityScore"
          FROM "events"."events" e
          WHERE e.status = ${EventStatus.ACTIVE}::"events"."EventStatus"
            AND (e.start_date IS NULL OR e.start_date >= ${now})
            ${locationClause}
            ${seenClause}
          ORDER BY e.start_date ASC NULLS LAST, e.created_at DESC
          LIMIT ${normalizedLimit}
          OFFSET ${normalizedOffset}
        `;

    if (matches.length === 0) {
      return [];
    }

    const events = await this.prisma.event.findMany({
      where: {
        id: { in: matches.map((match) => match.id) },
      },
    });

    const similarityById = new Map(matches.map((match) => [match.id, match.similarityScore]));
    const eventById = new Map(events.map((event) => [event.id, event]));

    const orderedEvents = matches
      .map((match) => {
        const event = eventById.get(match.id);
        if (!event) {
          return null;
        }

        return {
          ...event,
          similarityScore: match.similarityScore,
        };
      })
      .filter((event): event is Event & { similarityScore: number } => event !== null);

    const masterDataIds = [
      ...new Set([
        ...orderedEvents.map((e) => e.categoryId).filter((id): id is string => id !== null),
        ...orderedEvents.map((e) => e.locationId).filter((id): id is string => id !== null),
      ]),
    ];

    const masterDataValueById = new Map<string, string>();
    if (masterDataIds.length > 0) {
      const masterDataRows = await this.prisma.category.findMany({
        where: { id: { in: masterDataIds } },
        select: { id: true, value: true },
      });
      for (const row of masterDataRows) {
        if (row.value) masterDataValueById.set(row.id, row.value);
      }
    }

    return Promise.all(
      orderedEvents.map(async (event) => {
        const registeredCount = await this.eventsRepository.countActiveRegistrations(event.id);

        return {
          ...this.sanitizePublicEvent(event),
          registeredCount,
          similarityScore: similarityById.get(event.id) ?? 0,
          categoryName: event.categoryId ? (masterDataValueById.get(event.categoryId) ?? null) : null,
          locationName: event.locationId ? (masterDataValueById.get(event.locationId) ?? null) : null,
        };
      }),
    );
  }

  private sanitizePublicEvent<T extends { meetingUrl: string | null; isMeetingUrlPublished: boolean }>(event: T): T {
    return {
      ...event,
    };
  }

  private async syncEventSearchData(
    eventId: string,
    params: { tagIds?: string[] | null; locationId?: string | null },
  ): Promise<void> {
    const keywords = await this.buildEventKeywords(params);

    if (!keywords) {
      await this.eventsRepository.updateKeywords(eventId, null);
      await this.eventsRepository.updateEmbedding(eventId, null);
      return;
    }

    await this.eventsRepository.updateKeywords(eventId, keywords);
    const embedding = await this.userService.generateEmbedding(keywords);
    await this.eventsRepository.updateEmbedding(eventId, embedding);
  }

  private async buildEventKeywords(params: {
    tagIds?: string[] | null;
    locationId?: string | null;
  }): Promise<string | null> {
    const tagIds = params.tagIds ?? [];

    // Extract year values (e.g., "2026")
    const yearKeywords = tagIds.filter(
      (id) => typeof id === 'string' && /^\d{4}$/.test(id),
    );

    const categoryIds = Array.from(
      new Set(
        tagIds.filter(
          (id): id is string =>
            typeof id === 'string' &&
            UUID_TAG_PATTERN.test(id) // allow only UUID
        )
      )
    );

    if (categoryIds.length === 0 && yearKeywords.length === 0) {
      return null;
    }

    const categories = categoryIds.length > 0
      ? await this.prisma.category.findMany({
          where: {
            id: {
              in: categoryIds,
            },
          },
          select: {
            id: true,
            value: true,
          },
        })
      : [];

    const categoryValueById = new Map(categories.map((category) => [category.id, category.value?.trim() ?? '']));
    // UUID-based keywords
    const tagKeywords = tagIds
      .map((tagId) => categoryValueById.get(tagId) ?? '')
      .filter((value) => value.length > 0);

    // Merge both
    const keywords = [...tagKeywords, ...yearKeywords].join(' ');

    return keywords.length > 0 ? keywords : null;
  }

  async attachTagsToEvent<T extends { tagIds?: string[] | null } & Record<string, any>>(
    event: T,
  ): Promise<Omit<T, 'tagIds'> & { tags: EventTagResponse[] }> {
    const [hydratedEvent] = await this.attachTagsToEvents([event]);
    return hydratedEvent;
  }

  async attachTagsToEvents<T extends { tagIds?: string[] | null } & Record<string, any>>(
    events: T[],
  ): Promise<Array<Omit<T, 'tagIds'> & { tags: EventTagResponse[] }>> {
    const allTagIds = Array.from(
      new Set(events.flatMap((event) => event.tagIds ?? []))
    );

    const validUUIDTags = allTagIds.filter(
      (id): id is string =>
        typeof id === "string" &&
        UUID_TAG_PATTERN.test(id)
    );

    const isYearTag = (id: string) => /^\d{4}$/.test(id);

    const categories = validUUIDTags.length > 0
      ? await this.prisma.category.findMany({
          where: {
            id: {
              in: validUUIDTags,
            },
          },
          select: {
            id: true,
            value: true,
          },
        })
      : [];

    const tagValueById = new Map(categories.map((category) => [category.id, category.value]));

    return events.map(({ tagIds: eventTagIds, ...event }) => ({
      ...event,
      tags: (eventTagIds ?? [])
        .map((id) => {
          if (isYearTag(id)) {
            return { id, value: id };
          }

          const value = tagValueById.get(id);
          if (!value) {
            return null;
          }

          return { id, value };
        })
        .filter(
          (tag): tag is { id: string; value: string } => tag !== null,
        ),
    }));
  }

  private async validateSpecializationTags(tagIds?: string[] | null): Promise<void> {
    const uuidTagIds = Array.from(
      new Set((tagIds ?? []).filter((id): id is string => typeof id === 'string' && UUID_TAG_PATTERN.test(id))),
    );

    if (uuidTagIds.length === 0) {
      return;
    }

    const specializationTags = await this.prisma.category.findMany({
      where: {
        id: { in: uuidTagIds },
        type: MasterDataCategoryType.SPECIALIZATION,
      },
      select: {
        id: true,
        status: true,
      },
    });

    const inactiveSpecializationIds = specializationTags
      .filter((tag) => tag.status !== MasterStatus.ACTIVE)
      .map((tag) => tag.id);

    if (inactiveSpecializationIds.length > 0) {
      throw new BadRequestException(
        `SPECIALIZATION tags must be ACTIVE: ${inactiveSpecializationIds.join(', ')}`,
      );
    }
  }

    async countByMasterDataId(masterDataId: string): Promise<number> {
        return this.eventsRepository.countByMasterDataId(masterDataId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REGISTRATION — internal registrations only
    // ──────────────────────────────────────────────────────────────────────────
    async registerForEvent(eventId: string, userId: string) {
        const event = await this.getEventOrThrow(eventId);

        // Must be ACTIVE to register
        this.assertStatus(event, [EventStatus.ACTIVE], 'Registrations are only open for ACTIVE events');

        // EXTERNAL events do not support in-app registration
        if (event.registrationType === RegistrationType.EXTERNAL) {
            throw new InvalidEventStateException(
                'This event uses external registration. Please use the provided external URL.',
            );
        }

        // Check duplicate registration
        const existing = await this.registrationsRepository.findByEventAndUser(eventId, userId);
        if (existing && existing.status !== RegistrationStatus.CANCELLED) {
            throw new ConflictException('You are already registered for this event');
        }

        // Check capacity
        if (event.capacity !== null) {
            const activeCount = await this.registrationsRepository.countActiveByEvent(eventId);
            if (activeCount >= event.capacity) {
                throw new EventCapacityExceededException(eventId);
            }
        }

        // If previously cancelled registration exists, re-activate it
        if (existing && existing.status === RegistrationStatus.CANCELLED) {
            const updated = await this.registrationsRepository.update(existing.id, {
                status: RegistrationStatus.REGISTERED,
                registeredAt: new Date(),
            });
            this.eventEmitter.emit('event.registered', { event, registration: updated });

            try {
                await this.notifyEmployerOfRegistration(event, updated, userId);
            } catch (error) {
                this.logger.error(
                    `Failed to notify organization of registration for event ${event.id}`,
                    (error as Error).stack,
                );
            }

            return updated;
        }

        const registration = await this.registrationsRepository.create({
            event: { connect: { id: eventId } },
            user: {
                connect: {
                    userId: userId,
                },
            },
            status: RegistrationStatus.REGISTERED,
        });

        this.logger.log(`User ${userId} registered for event ${eventId}`);
        this.eventEmitter.emit('event.registered', { event, registration });

        try {
            await this.notifyEmployerOfRegistration(event, registration, userId);
        } catch (error) {
            this.logger.error(
                `Failed to notify organization of registration for event ${event.id}`,
                (error as Error).stack,
            );
        }

        return registration;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL REGISTRATION
    // ──────────────────────────────────────────────────────────────────────────
    async cancelRegistration(eventId: string, userId: string) {
        const event = await this.getEventOrThrow(eventId);

        const registration = await this.registrationsRepository.findByEventAndUser(eventId, userId);
        if (!registration || registration.status === RegistrationStatus.CANCELLED) {
            throw new InvalidEventStateException('You are not registered for this event');
        }

        const updated = await this.registrationsRepository.update(registration.id, {
            status: RegistrationStatus.CANCELLED,
        });

        this.logger.log(`User ${userId} cancelled registration for event ${eventId}`);
        this.eventEmitter.emit('event.registration.cancelled', { event, registration: updated });
        return updated;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST REGISTRATIONS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    async getRegistrations(eventId: string, userId: string, query: ListRegistrationsDto) {
      const event = await this.getEventOrThrow(eventId);
      const isAdmin = await this.isAdminUser(userId);
      if (!isAdmin) {
        await this.assertOrgMembership(userId, event.organizationId);
      }
        const result = await this.registrationsRepository.findAllByEvent(eventId, query);

        return {
            registrations: result.registrations.map((registration) =>
                this.decorateRegistrationWithExtendedData(registration),
            ),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACK EXTERNAL CLICK — authenticated user
    // ──────────────────────────────────────────────────────────────────────────
    async trackExternalClick(eventId: string, userId: string): Promise<void> {
        const event = await this.getEventOrThrow(eventId);

        const click = await this.externalClicksRepository.create(eventId, userId);

        this.eventEmitter.emit(AnalyticsEventType.EVENT_EXTERNAL_REGISTRATION_CLICKED, {
            eventId,
            userId,
            organizationId: event.organizationId,
            idempotencyKey: click.id,
        });

        this.logger.log(`User ${userId} clicked external registration for event ${eventId}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST EXTERNAL CLICKS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    async getExternalClicks(eventId: string, userId: string, query: ListRegistrationsDto) {
        const event = await this.getEventOrThrow(eventId);
        await this.assertOrgMembership(userId, event.organizationId);

        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 100);
        const { clicks, total } = await this.externalClicksRepository.findByEvent(eventId, page, limit);

        return {
            clicks: clicks.map((c) => ({
                id: c.id,
                clickedAt: c.clickedAt,
                user: c.user
                    ? { fullName: c.user.fullName, email: c.user.email }
                    : null,
            })),
            total,
            page,
            limit,
        };
    }

    private decorateRegistrationWithExtendedData<
        T extends {
            user?: {
                id?: string;
                fullName?: string | null;
                email?: string | null;
                mobileNumber?: string | null;
                phoneNumber?: string | null;
                currentCityId?: string | null;
                stateId?: string | null;
                countryId?: string | null;
                experienceLevelId?: string | null;
                highestQualificationId?: string | null;
                totalExperienceMonths?: number | null;
                preferredEmploymentTypeId?: string[];
                preferredWorkMode?: string[];
                shiftPreference?: string | null;
                availableJoiningDate?: Date | null;
                preferredLocations?: { locationId: string }[];
                education?: any[];
                experience?: any[];
                skills?: any[];
            } | null;
            status?: string;
            registeredAt?: Date;
        } & Record<string, any>
    >(registration: T): any {
        return {
            id: registration.id,
            status: registration.status,
            registeredAt: registration.registeredAt,
            user: registration.user ? {
                id: registration.user.id,
                fullName: registration.user.fullName,
                email: registration.user.email,
                mobile:
                    registration.user.mobileNumber ??
                    registration.user.phoneNumber ??
                    null,
                profile: {
                    currentCityId: registration.user.currentCityId,
                    stateId: registration.user.stateId,
                    countryId: registration.user.countryId,
                    experienceLevelId: registration.user.experienceLevelId,
                    highestQualificationId: registration.user.highestQualificationId,
                    totalExperienceMonths: registration.user.totalExperienceMonths,
                    education: Array.isArray(registration.user.education)
                        ? registration.user.education
                        : [],
                    jobPreferences: {
                        employmentType: registration.user.preferredEmploymentTypeId ?? [],
                        workMode: registration.user.preferredWorkMode ?? [],
                        shiftPreference: registration.user.shiftPreference ?? '',
                        availableJoiningDate: registration.user.availableJoiningDate ?? '',
                        preferredLocationIds: Array.isArray(registration.user.preferredLocations)
                            ? registration.user.preferredLocations.map((location) => location.locationId)
                            : [],
                    },
                    experiences: Array.isArray(registration.user.experience)
                        ? registration.user.experience.map((experience) => ({
                            jobTitle: experience.jobTitle ?? '',
                            companyName: experience.companyName ?? '',
                            years: experience.yearsOfExperience ?? 0,
                            months: experience.monthsOfExperience ?? 0,
                            employmentStatus: experience.employmentStatus ?? '',
                            currentSalary: experience.currentSalary ?? '',
                            expectedSalary: experience.expectedSalary ?? '',
                        }))
                        : [],
                    skills: Array.isArray(registration.user.skills)
                        ? registration.user.skills
                            .map((skill) => skill.masterDataId)
                            .filter((id): id is string => Boolean(id))
                        : [],
                    yearOfPassing: Array.isArray(registration.user.education)
                        ? registration.user.education.find((education) => education.yearOfPassing)?.yearOfPassing ?? null
                        : null,
                },
            } : null,
        };
    }

    async getRegistrationsForUser(userId: string, query: ListRegistrationsDto) {
        const result = await this.registrationsRepository.findAllByUser(userId, query);

        return {
            ...result,
            registrations: result.registrations.map((registration) =>
                this.decorateRegistrationForDisplay(registration),
            ),
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // MARK ATTENDANCE — employer only
    // ──────────────────────────────────────────────────────────────────────────
    async markAttendance(eventId: string, targetUserId: string, userId: string) {
        const event = await this.getEventOrThrow(eventId);
        await this.assertOrgMembership(userId, event.organizationId);

        const registration = await this.registrationsRepository.findByEventAndUser(eventId, targetUserId);
        if (!registration || registration.status === RegistrationStatus.CANCELLED) {
            throw new InvalidEventStateException(
                `User "${targetUserId}" does not have an active registration for this event`,
            );
        }

        const updated = await this.registrationsRepository.update(registration.id, {
            status: RegistrationStatus.ATTENDED,
        });

        this.logger.log(`Attendance marked for user ${targetUserId} at event ${eventId}`);
        return updated;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    private async getEventOrThrow(id: string): Promise<Event> {
        const event = await this.eventsRepository.findById(id);
        if (!event) throw new EventNotFoundException(id);
        return event;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NOTIFY REGISTERED USERS — ACTIVE + INTERNAL events only; never blocks the update
    // ──────────────────────────────────────────────────────────────────────────
    private async notifyRegisteredUsersOfUpdate(oldEvent: Event, updatedEvent: Event): Promise<void> {
        if (
            updatedEvent.status !== EventStatus.ACTIVE ||
            updatedEvent.registrationType !== RegistrationType.INTERNAL
        ) {
            return;
        }

        const userIds = await this.registrationsRepository.findRegisteredUserIds(updatedEvent.id);
        if (userIds.length === 0) {
            return;
        }

        const { title, message } = this.buildEventUpdateNotification(oldEvent, updatedEvent);

        await this.notifyRegisteredUsers(userIds, updatedEvent, title, message, 'EVENT_UPDATED');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NOTIFY REGISTERED USERS — INTERNAL events only; never blocks cancellation
    // ──────────────────────────────────────────────────────────────────────────
    private async notifyRegisteredUsersOfCancellation(
        cancelledEvent: Event,
        registeredUserIds: string[],
    ): Promise<void> {
        if (
            cancelledEvent.registrationType !== RegistrationType.INTERNAL ||
            registeredUserIds.length === 0
        ) {
            return;
        }

        await this.notifyRegisteredUsers(
            registeredUserIds,
            cancelledEvent,
            `Event Cancelled: ${cancelledEvent.title}`,
            'This event has been cancelled.',
            'EVENT_CANCELLED',
        );
    }

    private async notifyRegisteredUsers(
        userIds: string[],
        event: Event,
        title: string,
        message: string,
        metadataType: string,
    ): Promise<void> {
        await Promise.all(
            userIds.map(async (userId) => {
                try {
                    await this.notificationsService.createNotification({
                        userId,
                        type: NotificationType.EVENT_UPDATED,
                        title,
                        message,
                        entityType: EntityType.EVENT,
                        entityId: event.id,
                        metadata: {
                            type: metadataType,
                            eventId: event.id,
                        },
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to create notification for user ${userId} for event ${event.id}`,
                        (error as Error).stack,
                    );
                }
            }),
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NOTIFY EMPLOYER OF REGISTRATION — INTERNAL events only; never blocks registration
    // ──────────────────────────────────────────────────────────────────────────
    private async notifyEmployerOfRegistration(
        event: Event,
        registration: EventRegistration,
        registrantUserId: string,
    ): Promise<void> {
        if (event.registrationType !== RegistrationType.INTERNAL) {
            return;
        }

        const { data: organizationUsers } = await this.employersService.getOrganizationUsers(
            event.organizationId,
        );

        const recipientUserIds = [
            ...new Set(
                (organizationUsers ?? [])
                    .filter(
                        (member) =>
                            member.isActive &&
                            member.employer?.userId &&
                            member.employer.userId !== registrantUserId,
                    )
                    .map((member) => member.employer.userId as string),
            ),
        ];

        if (recipientUserIds.length === 0) {
            return;
        }

        const registrant = await this.prisma.profile.findUnique({
            where: { userId: registrantUserId },
            select: { fullName: true, email: true },
        });
        const registrantName = registrant?.fullName?.trim() || registrant?.email || 'A consumer';

        const title = 'New Event Registration';
        const message = `${registrantName} has registered for "${event.title}".`;

        await Promise.all(
            recipientUserIds.map(async (employerUserId) => {
                try {
                    await this.notificationsService.createNotification({
                        userId: employerUserId,
                        type: NotificationType.INFO,
                        title,
                        message,
                        entityType: EntityType.EVENT,
                        entityId: event.id,
                        metadata: {
                            type: 'EVENT_REGISTRATION',
                            eventId: event.id,
                            registrationId: registration.id,
                            consumerUserId: registrantUserId,
                        },
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to create registration notification for employer user ${employerUserId} for event ${event.id}`,
                        (error as Error).stack,
                    );
                }
            }),
        );
    }

    private readonly EVENT_UPDATE_COMPARISON_FIELDS: (keyof Event)[] = [
        'title',
        'description',
        'categoryId',
        'mode',
        'locationId',
        'isMeetingUrlPublished',
        'registrationType',
        'externalRegistrationUrl',
        'capacity',
        'startDate',
        'endDate',
        'bannerImage',
        'tagIds',
        'isFree',
        'price',
    ];

    private getChangedEventFields(oldEvent: Event, updatedEvent: Event): string[] {
        return this.EVENT_UPDATE_COMPARISON_FIELDS.filter(
            (field) => !this.areFieldValuesEqual(oldEvent[field], updatedEvent[field]),
        );
    }

    // startDate/endDate are two DB columns but represent a single logical
    // "schedule" change from a notification standpoint.
    private getChangedEventFieldGroups(oldEvent: Event, updatedEvent: Event): string[] {
        const changedFields = this.getChangedEventFields(oldEvent, updatedEvent);
        const groups = new Set<string>();

        for (const field of changedFields) {
            groups.add(field === 'startDate' || field === 'endDate' ? 'schedule' : field);
        }

        return Array.from(groups);
    }

    private areFieldValuesEqual(oldValue: unknown, newValue: unknown): boolean {
        if (oldValue instanceof Date || newValue instanceof Date) {
            const oldTime = oldValue instanceof Date ? oldValue.getTime() : null;
            const newTime = newValue instanceof Date ? newValue.getTime() : null;
            return oldTime === newTime;
        }

        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            if (oldValue.length !== newValue.length) {
                return false;
            }
            const sortedOld = [...oldValue].sort();
            const sortedNew = [...newValue].sort();
            return sortedOld.every((value, index) => value === sortedNew[index]);
        }

        if (oldValue && newValue && typeof (oldValue as any).equals === 'function') {
            // Prisma.Decimal (price)
            return (oldValue as any).equals(newValue as any);
        }

        return oldValue === newValue;
    }

    private buildEventUpdateNotification(
        oldEvent: Event,
        updatedEvent: Event,
    ): { title: string; message: string } {
        const title = `Event Updated: ${updatedEvent.title}`;
        const changedGroups = this.getChangedEventFieldGroups(oldEvent, updatedEvent);

        if (changedGroups.length === 1) {
            switch (changedGroups[0]) {
                case 'title':
                    return { title, message: 'Event title has been updated.' };

                case 'locationId':
                    return { title, message: 'Event location has been updated.' };

                case 'capacity':
                    return { title, message: 'Event capacity has been updated.' };

                case 'schedule':
                    return { title, message: 'Event schedule has been updated.' };

                case 'description':
                    return {
                        title,
                        message: 'The event description has been updated. Please review the latest details.',
                    };

                case 'isMeetingUrlPublished':
                    return updatedEvent.isMeetingUrlPublished
                        ? { title, message: 'The meeting URL for this event has been published.' }
                        : { title, message: 'The meeting URL for this event has been unpublished.' };
            }
        }

        return {
            title,
            message: 'Some event details have been updated. Please review the latest information.',
        };
    }

    private decorateRegistrationForDisplay<
        T extends {
            status: string;
            event?: { status?: EventStatus; endDate?: Date | string | null } | null;
        }>(
        registration: T,
    ): T {
        if (registration.status === RegistrationStatus.CANCELLED) {
            return registration;
        }

        if (registration.event?.status === EventStatus.CANCELLED) {
            return {
                ...registration,
                status: RegistrationStatus.CANCELLED,
            };
        }

        if (registration.event?.status === EventStatus.COMPLETED) {
            return {
                ...registration,
                status: EventStatus.COMPLETED,
            };
        }

        const eventEndDate = registration.event?.endDate ? new Date(registration.event.endDate) : null;
        if (!eventEndDate || Number.isNaN(eventEndDate.getTime())) {
            return registration;
        }

        if (eventEndDate <= new Date()) {
            return {
                ...registration,
                status: EventStatus.COMPLETED,
            };
        }

        return registration;
    }

    private async assertOrgMembership(userId: string, organizationId: string): Promise<void> {
        if (await this.isAdminUser(userId)) {
            return;
        }

        const role = await this.employerUsersService.getUserRole(userId, organizationId);
        if (!role) {
            throw new UnauthorizedEventAccessException(
                'You must be a member of the organization to perform this action',
            );
        }
    }

    private async isAdminUser(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        return user?.role === 'ADMIN';
    }

    private assertStatus(event: Event, allowedStatuses: EventStatus[], message: string): void {
        if (!allowedStatuses.includes(event.status)) {
            throw new InvalidEventStateException(message);
        }
    }

    private assertTransition(event: Event, targetStatus: EventStatus): void {
        const allowed = ALLOWED_TRANSITIONS[event.status] ?? [];
        if (!allowed.includes(targetStatus)) {
            throw new InvalidEventStateException(
                `Cannot transition event from "${event.status}" to "${targetStatus}". ` +
                `Allowed transitions from "${event.status}": [${allowed.join(', ') || 'none'}]`,
            );
        }
    }
    async deleteEvent(id: string, userId: string): Promise<void> {
    const event = await this.getEventOrThrow(id);
    const isAdmin = await this.isAdminUser(userId);

    if (!isAdmin) {
        await this.assertOrgMembership(userId, event.organizationId);
    }

    this.assertStatus(event, [EventStatus.DRAFT, EventStatus.CANCELLED], 'Only DRAFT or CANCELLED events can be deleted');

    await this.eventsRepository.delete(id);
    this.logger.log(`Event deleted: ${id} by ${userId}`);
    this.eventEmitter.emit('event.deleted', event);
}
}
