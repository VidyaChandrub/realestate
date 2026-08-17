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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const roles = [
        { key: 'super_admin', name: 'Super Admin', scope: 'platform', sortOrder: 0 },
        { key: 'admin', name: 'Admin', scope: 'organisation', sortOrder: 1 },
        { key: 'manager', name: 'Manager', scope: 'team', sortOrder: 2 },
        { key: 'sales', name: 'Sales', scope: 'team', sortOrder: 3 },
    ];
    for (const role of roles) {
        await prisma.role.upsert({
            where: { key: role.key },
            update: {},
            create: role,
        });
    }
    console.log(`Seeded ${roles.length} roles.`);
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@realestate.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!superAdminPassword) {
        console.warn('SUPER_ADMIN_PASSWORD not set in env — skipping Super Admin creation. ' +
            'Set it and re-run: SUPER_ADMIN_PASSWORD=yourpassword npx prisma db seed');
    }
    else {
        const passwordHash = await bcrypt.hash(superAdminPassword, 12);
        const superAdminRole = await prisma.role.findUniqueOrThrow({
            where: { key: 'super_admin' },
        });
        const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });
        if (!existing) {
            const user = await prisma.user.create({
                data: {
                    orgId: null,
                    email: superAdminEmail,
                    passwordHash,
                    status: 'active',
                    mustChangePassword: true,
                },
            });
            await prisma.userRole.create({
                data: { userId: user.id, roleId: superAdminRole.id },
            });
            console.log(`Super Admin created: ${superAdminEmail}`);
        }
        else {
            console.log(`Super Admin already exists: ${superAdminEmail} — skipped.`);
        }
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map