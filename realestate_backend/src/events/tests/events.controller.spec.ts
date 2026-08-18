// src/events/tests/events.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../../api/events.controller';
import { EventsService } from '../services/events.service';
import { EventStatus, EventMode, RegistrationType, RegistrationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

const makeEvent = (overrides: Partial<any> = {}): any => ({
    id: 'event-uuid-1',
    organizationId: 'org-uuid-1',
    title: 'Test Conference',
    mode: EventMode.ONLINE,
    meetingUrl: null,
    isMeetingUrlPublished: false,
    registrationType: RegistrationType.INTERNAL,
    status: EventStatus.DRAFT,
    isFree: true,
    isSponsored: false,
    boostScore: 0,
    tagIds: [],
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

const mockRequest = { user: { userId: 'user-kc-1' } };

describe('EventsController', () => {
    let controller: EventsController;
    let service: jest.Mocked<EventsService>;

    const mockEventsService = {
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        publishEvent: jest.fn(),
        cancelEvent: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        registerForEvent: jest.fn(),
        cancelRegistration: jest.fn(),
        getRegistrations: jest.fn(),
        getRegistrationsForUser: jest.fn(),
        markAttendance: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                { provide: EventsService, useValue: mockEventsService },
                { provide: Reflector, useValue: { getAllAndOverride: jest.fn().mockReturnValue(false) } },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn().mockReturnValue(true) })
            .compile();

        controller = module.get<EventsController>(EventsController);
        service = module.get(EventsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('create', () => {
        it('should call eventsService.createEvent and return the event', async () => {
            const event = makeEvent();
            const dto = { title: 'Test', mode: EventMode.ONLINE, registrationType: RegistrationType.INTERNAL, isFree: true } as any;
            mockEventsService.createEvent.mockResolvedValue(event);

            const result = await controller.create(dto, 'org-uuid-1', mockRequest as any);

            expect(service.createEvent).toHaveBeenCalledWith(dto, 'org-uuid-1', 'user-kc-1');
            expect(result).toEqual(event);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('update', () => {
        it('should call eventsService.updateEvent', async () => {
            const event = makeEvent({ title: 'Updated' });
            mockEventsService.updateEvent.mockResolvedValue(event);

            const result = await controller.update('event-uuid-1', { title: 'Updated' } as any, mockRequest as any);

            expect(service.updateEvent).toHaveBeenCalledWith('event-uuid-1', { title: 'Updated' }, 'user-kc-1');
            expect(result.title).toBe('Updated');
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('publish', () => {
        it('should call eventsService.publishEvent', async () => {
            const event = makeEvent({ status: EventStatus.ACTIVE });
            mockEventsService.publishEvent.mockResolvedValue(event);

            const result = await controller.publish('event-uuid-1', mockRequest as any);

            expect(service.publishEvent).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(EventStatus.ACTIVE);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('cancel', () => {
        it('should call eventsService.cancelEvent', async () => {
            const event = makeEvent({ status: EventStatus.CANCELLED });
            mockEventsService.cancelEvent.mockResolvedValue(event);

            const result = await controller.cancel('event-uuid-1', mockRequest as any);

            expect(service.cancelEvent).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(EventStatus.CANCELLED);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('findOne', () => {
        it('should return an event', async () => {
            const event = makeEvent();
            mockEventsService.findOne.mockResolvedValue(event);

            const result = await controller.findOne('event-uuid-1');
            expect(result).toEqual(event);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('findAll', () => {
        it('should return paginated events', async () => {
            mockEventsService.findAll.mockResolvedValue({ events: [makeEvent()], total: 1 });

            const result = await controller.findAll({ page: 1, limit: 20 } as any);

            expect(result.events).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.totalPages).toBe(1);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('register', () => {
        it('should call eventsService.registerForEvent', async () => {
            const registration = makeRegistration();
            mockEventsService.registerForEvent.mockResolvedValue(registration);

            const result = await controller.register('event-uuid-1', mockRequest as any);

            expect(service.registerForEvent).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.REGISTERED);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('cancelRegistration', () => {
        it('should call eventsService.cancelRegistration', async () => {
            const registration = makeRegistration({ status: RegistrationStatus.CANCELLED });
            mockEventsService.cancelRegistration.mockResolvedValue(registration);

            const result = await controller.cancelRegistration('event-uuid-1', mockRequest as any);

            expect(service.cancelRegistration).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.CANCELLED);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('getRegistrations', () => {
        it('should return registrations list for employer', async () => {
            const regList = { registrations: [makeRegistration()], total: 1 };
            mockEventsService.getRegistrations.mockResolvedValue(regList);

            const result = await controller.getRegistrations('event-uuid-1', { page: 1, limit: 20 } as any, mockRequest as any);

            expect(service.getRegistrations).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1', { page: 1, limit: 20 });
            expect(result.total).toBe(1);
        });
    });

    describe('getMyRegistrations', () => {
        it('should return registrations list for the current user', async () => {
            const regList = { registrations: [makeRegistration()], total: 1 };
            mockEventsService.getRegistrationsForUser.mockResolvedValue(regList);

            const result = await controller.getMyRegistrations({ page: 1, limit: 20 } as any, mockRequest as any);

            expect(service.getRegistrationsForUser).toHaveBeenCalledWith('user-kc-1', { page: 1, limit: 20 });
            expect(result.total).toBe(1);
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    describe('markAttendance', () => {
        it('should mark attendance via service', async () => {
            const registration = makeRegistration({ status: RegistrationStatus.ATTENDED });
            mockEventsService.markAttendance.mockResolvedValue(registration);

            const result = await controller.markAttendance('event-uuid-1', 'user-kc-1', mockRequest as any);

            expect(service.markAttendance).toHaveBeenCalledWith('event-uuid-1', 'user-kc-1', 'user-kc-1');
            expect(result.status).toBe(RegistrationStatus.ATTENDED);
        });
    });
});
