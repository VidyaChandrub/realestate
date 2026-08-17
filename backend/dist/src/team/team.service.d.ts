import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { InviteDto } from './dto/invite.dto';
export declare class TeamService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    invite(actor: JwtPayload, dto: InviteDto): Promise<{
        id: string;
        org_id: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone_number: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        must_change_password: boolean;
        created_at: Date;
    }>;
}
