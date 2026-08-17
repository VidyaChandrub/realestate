import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        access_token: string;
        refresh_token: string;
        organisation: {
            id: string;
            name: string;
            slug: string;
            status: import("@prisma/client").$Enums.OrgStatus;
            created_at: Date;
        };
        user: {
            id: string;
            org_id: string | null;
            first_name: string | null;
            last_name: string | null;
            email: string;
            phone_number: string | null;
            status: import("@prisma/client").$Enums.UserStatus;
            must_change_password: boolean;
            created_at: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            org_id: string | null;
            first_name: string | null;
            last_name: string | null;
            email: string;
            phone_number: string | null;
            status: import("@prisma/client").$Enums.UserStatus;
            must_change_password: boolean;
            created_at: Date;
        };
    }>;
    refresh(dto: RefreshDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(dto: LogoutDto): Promise<{
        success: boolean;
    }>;
}
