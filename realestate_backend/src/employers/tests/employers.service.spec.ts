import { Test, TestingModule } from '@nestjs/testing';
import { EmployersService } from '../services/employers.service';
import { EmployersRepository } from '../repositories/employers.repository';
import { EmployerUsersService } from '../services/employer-users.service';

describe('EmployersService', () => {
    let service: EmployersService;
    let repository: EmployersRepository;

    const mockRepository = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
    };

    const mockUsersService = {
        addUserToOrganization: jest.fn(),
        getUserRole: jest.fn()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmployersService,
                {
                    provide: EmployersRepository,
                    useValue: mockRepository,
                },
                {
                    provide: EmployerUsersService,
                    useValue: mockUsersService
                }
            ],
        }).compile();

        service = module.get<EmployersService>(EmployersService);
        repository = module.get<EmployersRepository>(EmployersRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
