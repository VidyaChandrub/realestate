// src/events/tests/events.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from '../services/events.service';
import { EventsRepository } from '../repositories/events.repository';
import { EventRegistrationsRepository } from '../repositories/event-registrations.repository';
import { EmployerUsersService } from '../../employers/services/employer-users.service';
import { PrismaService } from '../prisma.service';
import { UserService } from '../../user/user.service';
import { EventStatus, EventMode, RegistrationType, RegistrationStatus, OrganizationRole } from '@prisma/client';
import { EventNotFoundException } from '../exceptions/event-not-found.exception';
import { UnauthorizedEventAccessException } from '../exceptions/unauthorized-event-access.exception';
import { InvalidEventStateException } from '../exceptions/invalid-event-state.exception';
import { EventCapacityExceededException } from '../exceptions/event-capacity-exceeded.exception';
import { ConflictException } from '@nestjs/common';

// ─── Shared mock factories ────────────────────────────────────────────────────
const makeEvent = (overrides: Partial<any> = {}): any => ({
    id: 'event-uuid-1',
    organizationId: 'org-uuid-1',
    title: 'Test Conference',
    description: 'A great event',
    mode: EventMode.ONLINE,
    locationId: null,
    meetingUrl: null,
    isMeetingUrlPublished: false,
    categoryId: null,
    registrationType: RegistrationType.INTERNAL,
    externalRegistrationUrl: null,
    capacity: 100,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-02'),
    status: EventStatus.DRAFT,
    bannerImage: null,
    tagIds: [],
    isFree: true,
    price: null,
    isSponsored: false,
    sponsorCampaignId: null,
    boostScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeRegistration = (overrides: Partial<any> = {}): any => ({
    id: 'reg-uuid-1',
    eventId: 'event-uuid-1',
    userId: 'user-kc-1',
    status: RegistrationStatus.REGISTERED,
    registeredAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('EventsService', () => {
    let service: EventsService;
    let eventsRepository: jest.Mocked<EventsRepository>;
    let registrationsRepository: jest.Mocked<EventRegistrationsRepository>;
    let employerUsersService: jest.Mocked<EmployerUsersService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockEventsRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        updateKeywords: jest.fn(),
        updateEmbedding: jest.fn(),
        countActiveRegistrations: jest.fn(),
        cancelAllRegistrations: jest.fn(),
        reactivateAllRegistrations: jest.fn(),
    };

    const mockRegistrationsRepository = {
        create: jest.fn(),
        findByEventAndUser: jest.fn(),
        findAllByEvent: jest.fn(),
        findAllByUser: jest.fn(),
        update: jest.fn(),
        findByEventAndTargetUser: jest.fn(),
        countActiveByEvent: jest.fn(),
    };

    const mockEmployerUsersService = {
        getUserRole: jest.fn(),
        checkUserRole: jest.fn(),
    };

    const mockEventEmitter = { emit: jest.fn() };
    const mockUserService = {
        generateEmbedding: jest.fn().mockResolvedValue(Array(1536).fill(0.1)),
    };
    const mockPrismaService = {
        $queryRaw: jest.fn(),
        event: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        eventRegistration: {
            groupBy: jest.fn().mockResolvedValue([]),
        },
        category: {
            findMany: jest.fn().mockResolvedValue([]),
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        mockPrismaService.category.findMany.mockResolvedValue([]);
        mockPrismaService.$queryRaw.mockReset();
        mockPrismaService.event.findMany.mockReset();
        mockPrismaService.event.findMany.mockResolvedValue([]);
        mockPrismaService.eventRegistration.groupBy.mockReset();
        mockPrismaService.eventRegistration.groupBy.mockResolvedValue([]);
        mockUserService.generateEmbedding.mockResolvedValue(Array(1536).fill(0.1));
        mockUserService.findOrCreateProfile = jest.fn().mockResolvedValue({
            id: 'profile-1',
            userId: 'user-kc-1',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: EventsRepository, useValue: mockEventsRepository },
                { provide: EventRegistrationsRepository, useValue: mockRegistrationsRepository },
                { provide: EmployerUsersService, useValue: mockEmployerUsersService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: UserService, useValue: mockUserService },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
        eventsRepository = module.get(EventsRepository);
        registrationsRepository = module.get(EventRegistrationsRepository);
        employerUsersService = module.get(EmployerUsersService);
        eventEmitter = module.get(EventEmitter2);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // createEvent
    // ──────────────────────────────────────────────────────────────────────────
    describe('createEvent', () => {
        const dto = {
            title: 'Test Conf',
            mode: EventMode.ONLINE,
            registrationType: RegistrationType.INTERNAL,
            isFree: true,
        } as any;

        it('should create a DRAFT event and emit event.created', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockEventsRepository.create.mockResolvedValue(makeEvent());

            const result = await service.createEvent(dto, 'org-uuid-1', 'user-kc-1');

            expect(result.status).toBe(EventStatus.DRAFT);
            expect(mockEventsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    meetingUrl: undefined,
                    isMeetingUrlPublished: false,
                }),
            );
            expect(mockEventsRepository.updateKeywords).toHaveBeenCalledWith('event-uuid-1', null);
            expect(mockEventsRepository.updateEmbedding).toHaveBeenCalledWith('event-uuid-1', null);
            expect(eventEmitter.emit).toHaveBeenCalledWith('event.created', expect.anything());
        });

        it('should derive keywords from tag and location category values on create', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockPrismaService.category.findMany.mockResolvedValue([
                { id: 'tag-1', value: 'Nursing' },
                { id: 'tag-2', value: 'Workshop' },
                { id: 'loc-1', value: 'Bengaluru' },
            ]);
            mockEventsRepository.create.mockResolvedValue(
                makeEvent({
                    tagIds: ['tag-1', 'tag-2'],
                    locationId: 'loc-1',
                }),
            );

            await service.createEvent(
                {
                    ...dto,
                    mode: EventMode.OFFLINE,
                    locationId: 'loc-1',
                    tagIds: ['tag-1', 'tag-2'],
                } as any,
                'org-uuid-1',
                'user-kc-1',
            );

            expect(mockEventsRepository.updateKeywords).toHaveBeenCalledWith(
                'event-uuid-1',
                'Nursing Workshop Bengaluru',
            );
            expect(mockUserService.generateEmbedding).toHaveBeenCalledWith('Nursing Workshop Bengaluru');
            expect(mockEventsRepository.updateEmbedding).toHaveBeenCalledWith(
                'event-uuid-1',
                expect.any(Array),
            );
        });

        it('should throw UnauthorizedEventAccessException if not an org member', async () => {
            mockEmployerUsersService.getUserRole.mockResolvedValue(null);

            await expect(service.createEvent(dto, 'org-uuid-1', 'user-kc-1')).rejects.toThrow(
                UnauthorizedEventAccessException,
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // updateEvent
    // ──────────────────────────────────────────────────────────────────────────
    describe('updateEvent', () => {
        it('should update a DRAFT event', async () => {
            const event = makeEvent({ status: EventStatus.DRAFT });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.HR);
            mockEventsRepository.update.mockResolvedValue({ ...event, title: 'Updated' });

            const result = await service.updateEvent('event-uuid-1', { title: 'Updated' } as any, 'user-kc-1');

            expect(result.title).toBe('Updated');
        });

        it('should update meetingUrl when provided', async () => {
            const event = makeEvent({ status: EventStatus.DRAFT });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.HR);
            mockEventsRepository.update.mockResolvedValue({
                ...event,
                meetingUrl: 'https://meet.example.com/room-1',
            });

            const result = await service.updateEvent(
                'event-uuid-1',
                { meetingUrl: 'https://meet.example.com/room-1' } as any,
                'user-kc-1',
            );

            expect(mockEventsRepository.update).toHaveBeenCalledWith(
                'event-uuid-1',
                expect.objectContaining({ meetingUrl: 'https://meet.example.com/room-1' }),
            );
            expect(result.meetingUrl).toBe('https://meet.example.com/room-1');
        });

        it('should update meetingUrl publish status when provided', async () => {
            const event = makeEvent({ status: EventStatus.DRAFT });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.HR);
            mockEventsRepository.update.mockResolvedValue({
                ...event,
                isMeetingUrlPublished: true,
            });

            const result = await service.updateEvent(
                'event-uuid-1',
                { isMeetingUrlPublished: true } as any,
                'user-kc-1',
            );

            expect(mockEventsRepository.update).toHaveBeenCalledWith(
                'event-uuid-1',
                expect.objectContaining({ isMeetingUrlPublished: true }),
            );
            expect(result.isMeetingUrlPublished).toBe(true);
        });

        it('should update an ACTIVE event', async () => {
            const event = makeEvent({ status: EventStatus.ACTIVE });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockEventsRepository.update.mockResolvedValue({ ...event, title: 'Updated Active' });

            const result = await service.updateEvent('event-uuid-1', { title: 'Updated Active' } as any, 'user-kc-1');

            expect(mockEventsRepository.update).toHaveBeenCalledWith(
                'event-uuid-1',
                expect.objectContaining({ title: 'Updated Active' }),
            );
            expect(result.title).toBe('Updated Active');
        });

        it('should rebuild keywords from effective event tags and location on update', async () => {
            const event = makeEvent({
                status: EventStatus.ACTIVE,
                tagIds: ['tag-1'],
                locationId: 'loc-1',
            });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockPrismaService.category.findMany.mockResolvedValue([
                { id: 'tag-1', value: 'Nursing' },
                { id: 'loc-1', value: 'Bengaluru' },
            ]);
            mockEventsRepository.update.mockResolvedValue({ ...event, title: 'Updated Active' });

            await service.updateEvent('event-uuid-1', { title: 'Updated Active' } as any, 'user-kc-1');

            expect(mockEventsRepository.updateKeywords).toHaveBeenCalledWith('event-uuid-1', 'Nursing Bengaluru');
            expect(mockUserService.generateEmbedding).toHaveBeenCalledWith('Nursing Bengaluru');
            expect(mockEventsRepository.updateEmbedding).toHaveBeenCalledWith(
                'event-uuid-1',
                expect.any(Array),
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // publishEvent — state machine
    // ──────────────────────────────────────────────────────────────────────────
    describe('publishEvent', () => {
        it('should publish a DRAFT event with required fields set → ACTIVE', async () => {
            const event = makeEvent({
                status: EventStatus.DRAFT,
                startDate: new Date(),
                endDate: new Date(),
                title: 'Valid Event',
                mode: EventMode.ONLINE,
                registrationType: RegistrationType.INTERNAL,
            });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockEventsRepository.update.mockResolvedValue({ ...event, status: EventStatus.ACTIVE });

            const result = await service.publishEvent('event-uuid-1', 'user-kc-1');

            expect(result.status).toBe(EventStatus.ACTIVE);
            expect(eventEmitter.emit).toHaveBeenCalledWith('event.published', expect.anything());
        });

        it('should throw if event has no startDate', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ startDate: null, endDate: null }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.publishEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });

        it('should throw if trying to publish an ACTIVE event (no-op transition)', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.ACTIVE }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.publishEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });

        it('should throw if trying to publish a CANCELLED event (terminal)', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.CANCELLED }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.publishEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });

        it('should throw if trying to reactivate a COMPLETED event (terminal)', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.COMPLETED }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.publishEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });
    });

    describe('public event visibility', () => {
        it('should hide unpublished meetingUrl from public event detail', async () => {
            mockEventsRepository.findById.mockResolvedValue(
                makeEvent({
                    meetingUrl: 'https://meet.example.com/private-room',
                    isMeetingUrlPublished: false,
                }),
            );
            mockEventsRepository.countActiveRegistrations.mockResolvedValue(7);

            const result = await service.findOne('event-uuid-1');

            expect(result.meetingUrl).toBeNull();
            expect(result.isMeetingUrlPublished).toBe(false);
        });
    });

    describe('findAll', () => {
        it('should return registeredCount using one grouped registration query', async () => {
            const events = [
                makeEvent({ id: 'event-uuid-1', title: 'First Event' }),
                makeEvent({ id: 'event-uuid-2', title: 'Second Event' }),
                makeEvent({ id: 'event-uuid-3', title: 'Third Event' }),
            ];
            mockEventsRepository.findAll.mockResolvedValue({ events, total: 3 });
            mockPrismaService.eventRegistration.groupBy.mockResolvedValue([
                { eventId: 'event-uuid-1', _count: { eventId: 6 } },
                { eventId: 'event-uuid-3', _count: { eventId: 2 } },
            ]);

            const result = await service.findAll({ page: 1, limit: 20 } as any);

            expect(mockPrismaService.eventRegistration.groupBy).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.eventRegistration.groupBy).toHaveBeenCalledWith({
                by: ['eventId'],
                where: {
                    eventId: { in: ['event-uuid-1', 'event-uuid-2', 'event-uuid-3'] },
                    status: RegistrationStatus.REGISTERED,
                },
                _count: {
                    eventId: true,
                },
            });
            expect(mockEventsRepository.countActiveRegistrations).not.toHaveBeenCalled();
            expect(result.events).toEqual([
                expect.objectContaining({ id: 'event-uuid-1', registeredCount: 6, tags: [] }),
                expect.objectContaining({ id: 'event-uuid-2', registeredCount: 0, tags: [] }),
                expect.objectContaining({ id: 'event-uuid-3', registeredCount: 2, tags: [] }),
            ]);
            expect(result.total).toBe(3);
        });

        it('should skip the grouped count query when no events are returned', async () => {
            mockEventsRepository.findAll.mockResolvedValue({ events: [], total: 0 });

            const result = await service.findAll({ page: 1, limit: 20 } as any);

            expect(mockPrismaService.eventRegistration.groupBy).not.toHaveBeenCalled();
            expect(result).toEqual({ events: [], total: 0 });
        });
    });

    describe('getRelevantEvents', () => {
        it('should return relevant events ordered by recency', async () => {
            mockPrismaService.$queryRaw
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([
                    { id: 'event-2', similarityScore: 0 },
                    { id: 'event-1', similarityScore: 0 },
                ]);

            mockPrismaService.event.findMany.mockResolvedValue([
                makeEvent({
                    id: 'event-1',
                    status: EventStatus.ACTIVE,
                    meetingUrl: 'https://meet.example.com/private-room',
                    isMeetingUrlPublished: false,
                }),
                makeEvent({
                    id: 'event-2',
                    status: EventStatus.ACTIVE,
                    meetingUrl: 'https://meet.example.com/public-room',
                    isMeetingUrlPublished: true,
                }),
            ]);
            mockEventsRepository.countActiveRegistrations
                .mockResolvedValueOnce(6)
                .mockResolvedValueOnce(3);

            const result = await service.getRelevantEvents(
                { userId: 'user-kc-1' },
                { limit: 20, offset: 5 },
            );

            expect(result.map((event) => event.id)).toEqual(['event-2', 'event-1']);
            expect(result[0]).toMatchObject({
                id: 'event-2',
                registeredCount: 6,
                similarityScore: 0,
                meetingUrl: 'https://meet.example.com/public-room',
            });
            expect(result[1]).toMatchObject({
                id: 'event-1',
                registeredCount: 3,
                similarityScore: 0,
                meetingUrl: null,
            });
            expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
        });

        it('should keep published meetingUrl in relevant events', async () => {
            mockPrismaService.$queryRaw
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{ id: 'event-1', similarityScore: 0 }]);

            mockPrismaService.event.findMany.mockResolvedValue([
                makeEvent({
                    id: 'event-1',
                    status: EventStatus.ACTIVE,
                    meetingUrl: 'https://meet.example.com/public-room',
                    isMeetingUrlPublished: true,
                }),
            ]);
            mockEventsRepository.countActiveRegistrations.mockResolvedValueOnce(3);

            const result = await service.getRelevantEvents(
                { userId: 'user-kc-1' },
                { limit: 10, offset: 0 },
            );

            expect(result[0].meetingUrl).toBe('https://meet.example.com/public-room');
            expect(result[0].isMeetingUrlPublished).toBe(true);
        });

        it('should hide unpublished meetingUrl in relevant events', async () => {
            mockPrismaService.$queryRaw
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{ id: 'event-1', similarityScore: 0 }]);

            mockPrismaService.event.findMany.mockResolvedValue([
                makeEvent({
                    id: 'event-1',
                    status: EventStatus.ACTIVE,
                    meetingUrl: 'https://meet.example.com/private-room',
                    isMeetingUrlPublished: false,
                }),
            ]);
            mockEventsRepository.countActiveRegistrations.mockResolvedValueOnce(3);

            const result = await service.getRelevantEvents(
                { userId: 'user-kc-1' },
                { limit: 10, offset: 0 },
            );

            expect(result[0].meetingUrl).toBeNull();
            expect(result[0].isMeetingUrlPublished).toBe(false);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // cancelEvent
    // ──────────────────────────────────────────────────────────────────────────
    describe('cancelEvent', () => {
        it('should cancel a DRAFT event', async () => {
            const event = makeEvent({ status: EventStatus.DRAFT });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockEventsRepository.update.mockResolvedValue({ ...event, status: EventStatus.CANCELLED });

            const result = await service.cancelEvent('event-uuid-1', 'user-kc-1');

            expect(result.status).toBe(EventStatus.CANCELLED);
            expect(eventEmitter.emit).toHaveBeenCalledWith('event.cancelled', expect.anything());
        });

        it('should cancel an ACTIVE event', async () => {
            const event = makeEvent({ status: EventStatus.ACTIVE });
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);
            mockEventsRepository.update.mockResolvedValue({ ...event, status: EventStatus.CANCELLED });

            const result = await service.cancelEvent('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(EventStatus.CANCELLED);
        });

        it('should throw if re-cancelling a CANCELLED event', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.CANCELLED }));
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.OWNER);

            await expect(service.cancelEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // registerForEvent
    // ──────────────────────────────────────────────────────────────────────────
    describe('registerForEvent', () => {
        const activeEvent = makeEvent({ status: EventStatus.ACTIVE });

        it('should register a user for an ACTIVE INTERNAL event', async () => {
            mockEventsRepository.findById.mockResolvedValue(activeEvent);
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(null);
            mockRegistrationsRepository.countActiveByEvent.mockResolvedValue(5);
            mockRegistrationsRepository.create.mockResolvedValue(makeRegistration());

            const result = await service.registerForEvent('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.REGISTERED);
            expect(eventEmitter.emit).toHaveBeenCalledWith('event.registered', expect.anything());
        });

        it('should throw if event is not ACTIVE', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }));

            await expect(service.registerForEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });

        it('should throw if event is EXTERNAL type', async () => {
            mockEventsRepository.findById.mockResolvedValue(
                makeEvent({ status: EventStatus.ACTIVE, registrationType: RegistrationType.EXTERNAL }),
            );

            await expect(service.registerForEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });

        it('should throw ConflictException if already registered', async () => {
            mockEventsRepository.findById.mockResolvedValue(activeEvent);
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(makeRegistration());
            mockRegistrationsRepository.countActiveByEvent.mockResolvedValue(1);

            await expect(service.registerForEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                ConflictException,
            );
        });

        it('should throw EventCapacityExceededException when at full capacity', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.ACTIVE, capacity: 10 }));
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(null);
            mockRegistrationsRepository.countActiveByEvent.mockResolvedValue(10);

            await expect(service.registerForEvent('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                EventCapacityExceededException,
            );
        });

        it('should allow re-registration after cancellation', async () => {
            const cancelledReg = makeRegistration({ status: RegistrationStatus.CANCELLED });
            mockEventsRepository.findById.mockResolvedValue(activeEvent);
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(cancelledReg);
            mockRegistrationsRepository.countActiveByEvent.mockResolvedValue(0);
            mockRegistrationsRepository.update.mockResolvedValue({ ...cancelledReg, status: RegistrationStatus.REGISTERED });

            const result = await service.registerForEvent('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.REGISTERED);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // cancelRegistration
    // ──────────────────────────────────────────────────────────────────────────
    describe('cancelRegistration', () => {
        it('should cancel an active registration', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent({ status: EventStatus.ACTIVE }));
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(makeRegistration());
            mockRegistrationsRepository.update.mockResolvedValue(
                makeRegistration({ status: RegistrationStatus.CANCELLED }),
            );

            const result = await service.cancelRegistration('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.CANCELLED);
        });

        it('should throw if user not registered', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent());
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(null);

            await expect(service.cancelRegistration('event-uuid-1', 'user-kc-1')).rejects.toThrow(
                InvalidEventStateException,
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // markAttendance
    // ──────────────────────────────────────────────────────────────────────────
    describe('markAttendance', () => {
        it('should mark attendance for a registered user', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent());
            mockEmployerUsersService.getUserRole.mockResolvedValue(OrganizationRole.HR);
            mockRegistrationsRepository.findByEventAndUser.mockResolvedValue(makeRegistration());
            mockRegistrationsRepository.update.mockResolvedValue(
                makeRegistration({ status: RegistrationStatus.ATTENDED }),
            );

            const result = await service.markAttendance('event-uuid-1', 'user-kc-1', 'employer-kc-1');
            expect(result.status).toBe(RegistrationStatus.ATTENDED);
        });

        it('should throw UnauthorizedEventAccessException if not an org member', async () => {
            mockEventsRepository.findById.mockResolvedValue(makeEvent());
            mockEmployerUsersService.getUserRole.mockResolvedValue(null);

            await expect(service.markAttendance('event-uuid-1', 'user-kc-1', 'bad-actor')).rejects.toThrow(
                UnauthorizedEventAccessException,
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // getRegistrationsForUser
    // ──────────────────────────────────────────────────────────────────────────
    describe('getRegistrationsForUser', () => {
        it('should return paginated registrations for the user', async () => {
            const response = {
                registrations: [
                    makeRegistration({
                        event: {
                            id: 'event-uuid-1',
                            title: 'Test Conference',
                            description: 'A great event',
                            startDate: new Date('2026-06-01'),
                            endDate: new Date('2026-06-02'),
                            meetingUrl: 'https://meet.example.com/room-1',
                            isMeetingUrlPublished: true,
                            bannerImage: 'https://example.com/banner.png',
                        },
                    }),
                ],
                total: 1,
            };
            mockRegistrationsRepository.findAllByUser.mockResolvedValue(response);

            const result = await service.getRegistrationsForUser('user-kc-1', { page: 1, limit: 20 } as any);

            expect(mockRegistrationsRepository.findAllByUser).toHaveBeenCalledWith('user-kc-1', { page: 1, limit: 20 });
            expect(result.total).toBe(1);
            expect(result.registrations[0].event).toEqual(
                expect.objectContaining({
                    description: 'A great event',
                    endDate: new Date('2026-06-02'),
                    meetingUrl: 'https://meet.example.com/room-1',
                    isMeetingUrlPublished: true,
                }),
            );
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // findOne
    // ──────────────────────────────────────────────────────────────────────────
    describe('findOne', () => {
        it('should return the event', async () => {
            const event = makeEvent();
            mockEventsRepository.findById.mockResolvedValue(event);
            mockEventsRepository.countActiveRegistrations.mockResolvedValue(3);

            const result = await service.findOne('event-uuid-1');
            expect(result).toEqual({
                ...(({ tagIds: _tagIds, ...rest }) => rest)(event),
                registeredCount: 3,
                tags: [],
            });
        });

        it('should throw EventNotFoundException if not found', async () => {
            mockEventsRepository.findById.mockResolvedValue(null);

            await expect(service.findOne('bad-id')).rejects.toThrow(EventNotFoundException);
        });
    });
});
