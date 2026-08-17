import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { TeamService } from './team.service';
import { InviteDto } from './dto/invite.dto';
export declare class TeamController {
    private readonly teamService;
    constructor(teamService: TeamService);
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
