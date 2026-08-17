"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const tokens_util_1 = require("./utils/tokens.util");
const slug_util_1 = require("./utils/slug.util");
const mappers_util_1 = require("./utils/mappers.util");
const BCRYPT_COST_FACTOR = 12;
let AuthService = class AuthService {
    prisma;
    jwtService;
    accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async signup(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.work_email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const slug = await this.generateUniqueSlug(dto.company_name);
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
        const adminRole = await this.prisma.role.findUniqueOrThrow({
            where: { key: 'admin' },
        });
        const { user, organisation } = await this.prisma.$transaction(async (tx) => {
            const organisation = await tx.organisation.create({
                data: { name: dto.company_name, slug },
            });
            const user = await tx.user.create({
                data: {
                    orgId: organisation.id,
                    firstName: dto.first_name,
                    lastName: dto.last_name,
                    email: dto.work_email,
                    phoneNumber: dto.phone_number,
                    passwordHash,
                    status: 'active',
                },
            });
            await tx.userRole.create({
                data: { userId: user.id, roleId: adminRole.id },
            });
            return { user, organisation };
        });
        const tokens = await this.issueTokens(user.id, organisation.id, ['admin']);
        return {
            organisation: (0, mappers_util_1.toSafeOrganisation)(organisation),
            user: (0, mappers_util_1.toSafeUser)(user),
            ...tokens,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const roles = user.userRoles.map((userRole) => userRole.role.key);
        const tokens = await this.issueTokens(user.id, user.orgId, roles);
        return { user: (0, mappers_util_1.toSafeUser)(user), ...tokens };
    }
    async refresh(rawToken) {
        const existing = await this.findActiveRefreshToken(rawToken);
        const user = await this.prisma.user.findUnique({
            where: { id: existing.userId },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        await this.prisma.refreshToken.update({
            where: { id: existing.id },
            data: { revokedAt: new Date() },
        });
        const roles = user.userRoles.map((userRole) => userRole.role.key);
        return this.issueTokens(user.id, user.orgId, roles);
    }
    async logout(rawToken) {
        const tokenHash = (0, tokens_util_1.hashToken)(rawToken);
        const existing = await this.prisma.refreshToken.findFirst({
            where: { tokenHash },
        });
        if (existing && !existing.revokedAt) {
            await this.prisma.refreshToken.update({
                where: { id: existing.id },
                data: { revokedAt: new Date() },
            });
        }
        return { success: true };
    }
    async findActiveRefreshToken(rawToken) {
        const tokenHash = (0, tokens_util_1.hashToken)(rawToken);
        const existing = await this.prisma.refreshToken.findFirst({
            where: { tokenHash },
        });
        if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        return existing;
    }
    async issueTokens(userId, orgId, roles) {
        const payload = { sub: userId, orgId, roles };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: this.accessExpiresIn,
        });
        const rawRefreshToken = (0, tokens_util_1.generateRandomToken)();
        const tokenHash = (0, tokens_util_1.hashToken)(rawRefreshToken);
        const expiresAt = new Date(Date.now() + (0, tokens_util_1.parseDuration)(this.refreshExpiresIn));
        await this.prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
        return { access_token: accessToken, refresh_token: rawRefreshToken };
    }
    async generateUniqueSlug(companyName) {
        const base = (0, slug_util_1.slugify)(companyName);
        let candidate = base;
        let attempts = 0;
        while (await this.prisma.organisation.findUnique({ where: { slug: candidate } })) {
            attempts += 1;
            if (attempts > 5) {
                throw new common_1.ConflictException('Could not generate a unique organisation slug');
            }
            candidate = `${base}-${(0, crypto_1.randomBytes)(3).toString('hex')}`;
        }
        return candidate;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map