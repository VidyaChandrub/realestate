import { Test, TestingModule } from '@nestjs/testing';
import { EmployersController } from '../../api/employers.controller';
import { EmployersService } from '../services/employers.service';
import { EmployerUsersService } from '../services/employer-users.service';

describe('EmployersController', () => {
    let controller: EmployersController;

    const mockEmployersService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        findMyOrganizations: jest.fn()
    };

    const mockUsersService = {
        addUserToOrganization: jest.fn(),
        getUserRole: jest.fn()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EmployersController],
            providers: [
                {
                    provide: EmployersService,
                    useValue: mockEmployersService,
                },
                {
                    provide: EmployerUsersService,
                    useValue: mockUsersService
                }
            ],
        }).compile();

        controller = module.get<EmployersController>(EmployersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
