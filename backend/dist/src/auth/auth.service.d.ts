import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly accessExpiresIn;
    private readonly refreshExpiresIn;
    constructor(prisma: PrismaService, jwtService: JwtService);
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
    refresh(rawToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(rawToken: string): Promise<{
        success: boolean;
    }>;
    private findActiveRefreshToken;
    private issueTokens;
    private generateUniqueSlug;
}
