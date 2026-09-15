import { PrismaClient, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  bindLandingPageContent,
  snapshotFromProject,
} from '../src/common/utils/landing-page-property.util';
import { asTemplateJson, builderTemplateContent } from './seed-builder-page';

// Place this at: prisma/seed.ts
// Run with: npx prisma db seed
//
// Seeds:
//   1. Roles catalogue (super_admin / admin / manager / sales)
//   2. Super Admin account (from env, optional)
//   3. A demo organisation + org admin (no extra sales/users roster)
//   4. A demo project assigned to the seeded manager and sales users
//   5. Demo landing pages (empty until published content is added)
//   6. Two demo CRM leads for Lead Center (Skyline Heights)
//
const prisma = new PrismaClient();

const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Welcome@123';

interface AgentSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'manager' | 'sales';
  status: 'active' | 'disabled';
}

const AGENTS: AgentSeed[] = [
  {
    firstName: 'Rohan',
    lastName: 'Shah',
    email: 'rohan@skylinedev.in',
    phone: '+91 98250 11020',
    role: 'admin',
    status: 'active',
  },
];

async function seedRoles() {
  const roles = [
    {
      key: 'super_admin',
      name: 'Super Admin',
      scope: 'platform' as const,
      sortOrder: 0,
    },
    {
      key: 'admin',
      name: 'Admin',
      scope: 'organisation' as const,
      sortOrder: 1,
    },
    { key: 'manager', name: 'Manager', scope: 'team' as const, sortOrder: 2 },
    { key: 'sales', name: 'Sales', scope: 'team' as const, sortOrder: 3 },
    { key: 'telecaller', name: 'Telecaller', scope: 'team' as const, sortOrder: 4 },
  ];

  for (const role of roles) {
    const existingRole = await prisma.role.findFirst({
      where: { orgId: null, key: role.key },
    });
    if (existingRole) {
      // no fields to update — system role definitions are fixed
    } else {
      await prisma.role.create({ data: role });
    }
  }
  console.log(`Seeded ${roles.length} roles.`);
  return roles;
}

async function seedSuperAdmin() {
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL ?? 'admin@realestate.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    console.warn(
      'SUPER_ADMIN_PASSWORD not set in env — skipping Super Admin creation. ' +
        'Set it and re-run: SUPER_ADMIN_PASSWORD=yourpassword npx prisma db seed',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);
  const superAdminRole = await prisma.role.findFirstOrThrow({
    where: { orgId: null, key: 'super_admin' },
  });

  const existing = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });
  if (!existing) {
    const user = await prisma.user.create({
      data: {
        orgId: null,
        email: superAdminEmail,
        passwordHash,
        status: 'active',
        mustChangePassword: false,
        onboardingStep: 'completed',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: superAdminRole.id },
    });
    console.log(`Super Admin created: ${superAdminEmail}`);
  } else {
    console.log(`Super Admin already exists: ${superAdminEmail} — skipped.`);
  }
}

async function seedDemoOrg() {
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);

  // --- Organisation ---------------------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: 'skylinedev' },
    update: {
      name: 'Skyline Developers',
      city: 'Mumbai',
      status: 'active',
      industry: 'developer',
      teamSize: '11–50',
      country: 'India',
      state: 'Maharashtra',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
    create: {
      name: 'Skyline Developers',
      slug: 'skylinedev',
      city: 'Mumbai',
      status: 'active',
      industry: 'developer',
      teamSize: '11–50',
      country: 'India',
      state: 'Maharashtra',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  // --- Org admin (login). Extra demo sales users are not seeded. ------------
  const userIds: Record<string, string> = {};
  for (const agent of AGENTS) {
    const role = await prisma.role.findFirstOrThrow({
      where: { orgId: null, key: agent.role },
    });

    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {
        orgId: org.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        phoneNumber: agent.phone,
        status: agent.status,
      },
      create: {
        orgId: org.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phoneNumber: agent.phone,
        passwordHash,
        status: agent.status,
        onboardingStep: 'completed',
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    userIds[agent.email] = user.id;
  }
  console.log(
    `Org admin seeded: rohan@skylinedev.in — password: ${SEED_USER_PASSWORD}`,
  );

  // --- Demo project -----------------------------------------------------------
  const managerId = userIds['rohan@skylinedev.in'];
  const existingProject = await prisma.project.findFirst({
    where: { orgId: org.id, name: 'Skyline Heights' },
    select: { id: true },
  });
  const project = existingProject
    ? await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          location: 'Bandra East, Mumbai',
          reraId: 'P51800012345',
          possession: 'Dec 2027',
          managerId,
          status: 'active',
          priceMin: 12500000,
          priceMax: 28500000,
          baseRate: 18500,
          landArea: 4.5,
          towerCount: 3,
          floorsDescription: 'G+22',
          amenities: [
            { name: 'Swimming Pool', iconUrl: null },
            { name: 'Clubhouse', iconUrl: null },
            { name: 'Gymnasium', iconUrl: null },
          ],
          city: 'Mumbai',
          locality: 'Bandra East',
          pincode: '400051',
          connectivity: ['Metro', 'School', 'Hospital', 'Airport'],
          publishedToWebsite: true,
          projectType: 'Apartment',
          constructionStage: 'Under construction',
          tagline: 'Residences in Bandra East',
          highlights: 'RERA registered\nMetro connected\nClubhouse and pool',
          carpetRange: '1,250 – 2,450 sq.ft',
        },
      })
    : await prisma.project.create({
        data: {
          orgId: org.id,
          name: 'Skyline Heights',
          location: 'Bandra East, Mumbai',
          reraId: 'P51800012345',
          possession: 'Dec 2027',
          managerId,
          status: 'active',
          priceMin: 12500000,
          priceMax: 28500000,
          baseRate: 18500,
          landArea: 4.5,
          towerCount: 3,
          floorsDescription: 'G+22',
          amenities: [
            { name: 'Swimming Pool', iconUrl: null },
            { name: 'Clubhouse', iconUrl: null },
            { name: 'Gymnasium', iconUrl: null },
          ],
          city: 'Mumbai',
          locality: 'Bandra East',
          pincode: '400051',
          connectivity: ['Metro', 'School', 'Hospital', 'Airport'],
          publishedToWebsite: true,
          projectType: 'Apartment',
          constructionStage: 'Under construction',
          tagline: 'Residences in Bandra East',
          highlights: 'RERA registered\nMetro connected\nClubhouse and pool',
          carpetRange: '1,250 – 2,450 sq.ft',
        },
      });

  await prisma.projectSalesAgent.deleteMany({
    where: { projectId: project.id },
  });
  console.log(
    `Demo project seeded: ${project.name} — manager: rohan@skylinedev.in.`,
  );

  const unitTypes = [
    { name: '3 BHK', carpetSqft: 1450, builtupSqft: 1850, price: 12500000, totalUnits: 80 },
    { name: '4 BHK', carpetSqft: 2100, builtupSqft: 2650, price: 19800000, totalUnits: 40 },
  ];
  for (const ut of unitTypes) {
    const existing = await prisma.unitType.findFirst({
      where: { projectId: project.id, name: ut.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.unitType.update({ where: { id: existing.id }, data: ut });
    } else {
      await prisma.unitType.create({ data: { projectId: project.id, ...ut } });
    }
  }

  // --- Builder template + org page bound to the project --------------------
  const templateSource = builderTemplateContent();
  const configChoices = unitTypes.map((u) => u.name);
  const applyChoices = (form: { fields?: Array<{ id?: string; label?: string; options?: string[] }> } | undefined) => {
    for (const field of form?.fields ?? []) {
      if (field.id === 'sv-interest' || field.label === 'Interested in') {
        field.options = configChoices;
      }
    }
  };
  applyChoices(templateSource.config.form as { fields?: Array<{ id?: string; label?: string; options?: string[] }> });
  for (const form of (templateSource.config.forms as Array<{ fields?: Array<{ id?: string; label?: string; options?: string[] }> }> | undefined) ?? []) {
    applyChoices(form);
  }

  const template = await prisma.template.upsert({
    where: { slug: 'skyline-heights-builder' },
    update: {
      name: 'Project launch (builder)',
      status: 'published',
      kind: 'preset',
      pageType: 'landing',
      designId: 'tpl-estatepro',
      baseDesignName: 'Builder',
      category: 'Real Estate',
      content: asTemplateJson(templateSource),
    },
    create: {
      name: 'Project launch (builder)',
      slug: 'skyline-heights-builder',
      status: 'published',
      kind: 'preset',
      pageType: 'landing',
      designId: 'tpl-estatepro',
      baseDesignName: 'Builder',
      category: 'Real Estate',
      content: asTemplateJson(templateSource),
    },
  });
  await prisma.organisationTemplate.upsert({
    where: { orgId_templateId: { orgId: org.id, templateId: template.id } },
    update: {},
    create: { orgId: org.id, templateId: template.id },
  });

  const unitCount = await prisma.unit.count({ where: { projectId: project.id } });
  const bound = bindLandingPageContent(
    templateSource,
    { kind: 'project', projectId: project.id },
    snapshotFromProject({
      orgName: org.name,
      project,
      unitCount,
    }),
  );

  await prisma.landingPage.upsert({
    where: { orgId_slug: { orgId: org.id, slug: 'skyline-heights' } },
    update: {
      name: 'Skyline Heights',
      status: 'published',
      sourceTemplateId: template.id,
      content: bound as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
    create: {
      orgId: org.id,
      name: 'Skyline Heights',
      slug: 'skyline-heights',
      status: 'published',
      sourceTemplateId: template.id,
      content: bound as Prisma.InputJsonValue,
      pageType: 'landing',
      publishedAt: new Date(),
    },
  });
  console.log(
    `Builder template seeded (${template.slug}) and org page bound to ${project.name}.`,
  );

  // --- Landing pages --------------------------------------------------------
  const landingPages: { name: string; slug: string }[] = [
    { name: 'Palm Residency', slug: 'palm-residency' },
    { name: 'Green Vista', slug: 'green-vista' },
  ];
  const pageIds: Record<string, string> = {};
  for (const page of landingPages) {
    const row = await prisma.landingPage.upsert({
      where: { orgId_slug: { orgId: org.id, slug: page.slug } },
      update: { status: 'published' },
      create: {
        orgId: org.id,
        name: page.name,
        slug: page.slug,
        status: 'published',
        content: { sections: [] },
      },
    });
    pageIds[page.slug] = row.id;
  }
  console.log(`Landing pages seeded (${landingPages.length}) for ${org.name}.`);

  const demoLeads = [
    {
      email: 'ananya.mehta@example.com',
      source: 'website',
      formName: 'Palm Residency enquiry',
      landingPageId: pageIds['palm-residency'],
      status: 'new' as const,
      data: {
        fullName: 'Ananya Mehta',
        name: 'Ananya Mehta',
        phone: '+91 98765 43101',
        phoneNumber: '+91 98765 43101',
        email: 'ananya.mehta@example.com',
        project: 'Skyline Heights',
        'Interested in': '3 BHK',
      },
    },
    {
      email: 'vikram.rao@example.com',
      source: 'crm',
      formName: 'Manual lead',
      landingPageId: pageIds['green-vista'],
      status: 'contacted' as const,
      data: {
        fullName: 'Vikram Rao',
        name: 'Vikram Rao',
        phone: '+91 98765 43102',
        phoneNumber: '+91 98765 43102',
        email: 'vikram.rao@example.com',
        project: 'Skyline Heights',
        'Interested in': '4 BHK',
      },
    },
  ];

  let createdLeads = 0;
  for (const demo of demoLeads) {
    const existing = await prisma.lead.findFirst({
      where: {
        orgId: org.id,
        data: { path: ['email'], equals: demo.email },
      },
      select: { id: true },
    });
    if (existing) continue;

    const lead = await prisma.lead.create({
      data: {
        orgId: org.id,
        projectId: project.id,
        landingPageId: demo.landingPageId,
        formName: demo.formName,
        source: demo.source,
        status: demo.status,
        assignedToId: managerId,
        data: demo.data,
      },
    });
    await prisma.activityEvent.create({
      data: {
        orgId: org.id,
        agentId: managerId,
        leadId: lead.id,
        type: 'status_updated',
        text: `Lead seeded for ${demo.data.fullName}`,
      },
    });
    createdLeads += 1;
  }
  console.log(
    `Lead Center seeded: ${demoLeads.length} demo leads for ${org.name} (${createdLeads} new).`,
  );
}

async function seedEmailTables() {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS identity;`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS audit;`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS identity.email_configs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 587,
      secure BOOLEAN NOT NULL DEFAULT false,
      "user" TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      from_email TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT 'iPixxel Realty',
      reply_to TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      invite_subject TEXT,
      invite_body TEXT,
      reset_subject TEXT,
      reset_body TEXT,
      account_activated_subject TEXT,
      account_activated_body TEXT,
      account_deactivated_subject TEXT,
      account_deactivated_body TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS invite_subject TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS invite_body TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS reset_subject TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS reset_body TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS account_activated_subject TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS account_activated_body TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS account_deactivated_subject TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE identity.email_configs ADD COLUMN IF NOT EXISTS account_deactivated_body TEXT;`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS audit.email_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "to" TEXT NOT NULL,
      subject TEXT NOT NULL,
      template TEXT,
      status TEXT NOT NULL,
      error TEXT,
      metadata JSONB,
      sent_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_to_idx ON audit.email_logs("to");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_status_idx ON audit.email_logs(status);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON audit.email_logs(sent_at);`);
  console.log('Email configuration & audit log tables initialized successfully.');
}

async function seedDemoPlanAndSubscription() {
  const org = await prisma.organisation.findUnique({ where: { slug: 'skylinedev' } });
  if (!org) return;

  const plan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter',
      slug: 'starter',
      description: 'For small teams getting started — 5 landing pages, 1 project, 10 users.',
      priceMonthly: 999,
      priceYearly: 9990,
      features: [
        '5 landing pages',
        '1 project',
        '10 team members',
        'Publishing',
        'WhatsApp integration',
      ],
      limits: { projects: 1, users: 10, templates: 5, landingPages: 5 },
      capabilities: { publishing: true, whatsappIntegration: true },
      color: '#eef0fe',
      badge: 'b-indigo',
      isPopular: true,
      isActive: true,
    },
  });

  // One active subscription for the demo org so the publish gate and billing
  // screen work out of the box. Renews ~1 year out.
  const existing = await prisma.subscription.findFirst({
    where: { orgId: org.id, status: { not: 'cancelled' } },
  });
  if (!existing) {
    await prisma.subscription.create({
      data: {
        orgId: org.id,
        planId: plan.id,
        billingCycle: 'monthly',
        status: 'active',
        amount: plan.priceMonthly,
        mrr: plan.priceMonthly,
        currency: 'INR',
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Demo subscription seeded for ${org.name} (${plan.name}).`);
  }
}

async function main() {
  await seedRoles();
  await seedSuperAdmin();
  await seedDemoOrg();
  await seedEmailTables();
  await seedDemoPlanAndSubscription();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
