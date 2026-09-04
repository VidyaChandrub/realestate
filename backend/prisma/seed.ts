import { PrismaClient, Prisma, LeadStatus, ActivityType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Place this at: prisma/seed.ts
// Run with: npx prisma db seed
//
// Seeds:
//   1. Roles catalogue (super_admin / admin / manager / sales)
//   2. Super Admin account (from env, optional)
//   3. A demo organisation + its sales team (org admin, manager, sales agents,
//      all with full profile fields) so the Sales Agents dashboard and lead
//      inbox show realistic data out of the box.
//   4. A demo project assigned to the seeded manager and sales users.
//   5. Landing pages and a spread of leads assigned across the team, with
//      every Lead field populated (formName, source, status, budget in the
//      `data` JSON, captured-at timestamps).
//   6. Per-agent call logs and activity events powering the Calls & comms and
//      Activity tabs on each agent's dashboard.
//
// Idempotent: roles and users upsert by key/email, leads / calls / activity are
// re-seeded fresh for this org on every run, so `npx prisma db seed` can be
// re-run safely.

const prisma = new PrismaClient();

const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Welcome@123';

// Deterministic PRNG so re-seeds produce identical (realis) numbers.
function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rnd: () => number, items: [T, number][]): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let r = rnd() * total;
  for (const [value, weight] of items) {
    r -= weight;
    if (r <= 0) return value;
  }
  return items[items.length - 1][0];
}

const STATUSES: { status: string; weight: number }[] = [
  { status: 'new', weight: 0.2 },
  { status: 'contacted', weight: 0.18 },
  { status: 'follow_up', weight: 0.18 },
  { status: 'site_visit', weight: 0.14 },
  { status: 'negotiation', weight: 0.1 },
  { status: 'won', weight: 0.09 },
  { status: 'lost', weight: 0.11 },
];

const SOURCES: [string, number][] = [
  ['Meta', 0.34],
  ['Google', 0.22],
  ['WhatsApp', 0.18],
  ['Website', 0.14],
  ['Portal', 0.12],
];

const FORMS = [
  '3 BHK Enquiry',
  '2 BHK Enquiry',
  '4 BHK Enquiry',
  'Brochure Request',
  'Call Me Back',
  'Book Site Visit',
];

const NAMES = [
  'Rahul Mehta',
  'Meera Iyer',
  'Divya Shah',
  'Karan Patel',
  'Aarav Reddy',
  'Harsh Trivedi',
  'Sana Rahman',
  'Nikhil Bansal',
  'Pooja Nair',
  'Suresh Kumar',
  'Ananya Das',
  'Vikram Singh',
  'Kavita Joshi',
  'Arjun Menon',
  'Ritu Agarwal',
  'Sanjay Gupta',
  'Neha Kapoor',
  'Farhan Sheikh',
  'Lakshmi Iyer',
  'Deepak Rao',
  'Swati Deshmukh',
  'Manish Jain',
  'Rekha Sharma',
  'Aditya Bhowmick',
  'Ishita Roy',
  'Gaurav Malhotra',
  'Tanvi Kulkarni',
  'Rohit Nair',
  'Shreya Ghosh',
  'Pranav Pillai',
  'Alok Chatterjee',
  'Madhuri Patil',
  'Varun Thakur',
  'Nandini Rao',
  'Rajesh Khanna',
  'Kiran Bedi',
  'Yash Tiwari',
  'Sneha Reddy',
  'Amit Saxena',
  'Ritika Sethi',
  'Mohit Bhardwaj',
  'Priyanka Das',
  'Navin Shetty',
  'Beena Nair',
  'Sameer Khan',
  'Jyoti Kumari',
  'Ramesh Choudhary',
  'Parul Gandhi',
  'Kunal Arora',
  'Zoya Ansari',
];

const CITIES = [
  'Mumbai',
  'Pune',
  'Thane',
  'Navi Mumbai',
  'Bengaluru',
  'Hyderabad',
];

const BUDGETS: Record<string, [number, number]> = {
  '2 BHK': [55, 110], // lakhs
  '3 BHK': [100, 190],
  '4 BHK': [160, 280],
};

function budgetString(bhk: string, rnd: () => number): string {
  const [low, high] = BUDGETS[bhk] ?? BUDGETS['3 BHK'];
  const lakhs = low + rnd() * (high - low);
  return lakhs >= 100
    ? `₹${(lakhs / 100).toFixed(2)} Cr`
    : `₹${Math.round(lakhs)} L`;
}

function mobile(rnd: () => number): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(rnd() * 10)).join(
    '',
  );
  return `+91 9${digits}`;
}

interface AgentSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'manager' | 'sales';
  status: 'active' | 'disabled';
  leads: number;
}

const AGENTS: AgentSeed[] = [
  {
    firstName: 'Rohan',
    lastName: 'Shah',
    email: 'rohan@skylinedev.in',
    phone: '+91 98250 11020',
    role: 'admin',
    status: 'active',
    leads: 90,
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@skylinedev.in',
    phone: '+91 99870 34412',
    role: 'manager',
    status: 'active',
    leads: 85,
  },
  {
    firstName: 'Vijay',
    lastName: 'Chandel',
    email: 'vijay@skylinedev.in',
    phone: '+91 97250 88109',
    role: 'sales',
    status: 'active',
    leads: 75,
  },
  {
    firstName: 'Rohit',
    lastName: 'Mehta',
    email: 'rohit@skylinedev.in',
    phone: '+91 98204 55127',
    role: 'sales',
    status: 'active',
    leads: 70,
  },
  {
    firstName: 'Sneha',
    lastName: 'Kulkarni',
    email: 'sneha@skylinedev.in',
    phone: '+91 98980 33471',
    role: 'sales',
    status: 'active',
    leads: 62,
  },
  {
    firstName: 'Aditya',
    lastName: 'Verma',
    email: 'aditya@skylinedev.in',
    phone: null,
    role: 'sales',
    status: 'disabled',
    leads: 40,
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

  // --- Sales team (org admin + manager + sales agents) ----------------------
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
    `Sales team seeded (${Object.keys(userIds).length} users) — sign in with any ` +
      `of them, password: ${SEED_USER_PASSWORD}`,
  );

  // --- Demo project -----------------------------------------------------------
  const managerId = userIds['priya@skylinedev.in'];
  const projectSalesAgentIds = [
    userIds['vijay@skylinedev.in'],
    userIds['rohit@skylinedev.in'],
    userIds['sneha@skylinedev.in'],
  ];
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
        },
      });

  await prisma.projectSalesAgent.deleteMany({
    where: { projectId: project.id },
  });
  await prisma.projectSalesAgent.createMany({
    data: projectSalesAgentIds.map((userId) => ({
      projectId: project.id,
      userId,
    })),
  });
  console.log(
    `Demo project seeded: ${project.name} — manager: priya@skylinedev.in, ` +
      `${projectSalesAgentIds.length} sales users assigned.`,
  );

  // --- Landing pages --------------------------------------------------------
  const pages: { name: string; slug: string }[] = [
    { name: 'Palm Residency', slug: 'palm-residency' },
    { name: 'Green Vista', slug: 'green-vista' },
  ];
  const landingPages: Record<string, string> = {};
  for (const page of pages) {
    const lp = await prisma.landingPage.upsert({
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
    landingPages[page.slug] = lp.id;
  }

  // --- Leads (fresh each seed so counts stay consistent) --------------------
  await prisma.lead.deleteMany({ where: { orgId: org.id } });

  const rnd = mulberry32(20260902);
  const leads: Prisma.LeadCreateManyInput[] = [];

  const now = Date.now();
  for (const agent of AGENTS) {
    for (let i = 0; i < agent.leads; i++) {
      const firstName = NAMES[Math.floor(rnd() * NAMES.length)];
      const bhk = pickWeighted(rnd, [
        ['2 BHK', 0.32],
        ['3 BHK', 0.5],
        ['4 BHK', 0.18],
      ] as [string, number][]);
      const page = pickWeighted(rnd, [
        ['palm-residency', 0.62],
        ['green-vista', 0.38],
      ] as [string, number][]);
      const pageName =
        page === 'palm-residency' ? 'Palm Residency' : 'Green Vista';
      const status = pickWeighted(
        rnd,
        STATUSES.map((s) => [s.status, s.weight] as [string, number]),
      );

      leads.push({
        orgId: org.id,
        landingPageId: landingPages[page],
        formName: pickWeighted(
          rnd,
          FORMS.map((f) => [f, 1] as [string, number]),
        ),
        source: pickWeighted(rnd, SOURCES),
        data: {
          fullName: firstName,
          phone: mobile(rnd),
          email:
            rnd() > 0.25
              ? `${firstName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
              : null,
          city: CITIES[Math.floor(rnd() * CITIES.length)],
          project: pageName,
          bhk,
          budget: budgetString(bhk, rnd),
          interestedIn: `${bhk} · ${pageName}`,
          message:
            rnd() > 0.4 ? 'Interested in a site visit next weekend.' : null,
          utm: { channel: status === 'won' ? 'meta' : 'organic' },
        },
        status: status as LeadStatus,
        assignedToId: userIds[agent.email],
        // Bias inbound toward the trailing days so the last-14-days activity
        // chart on each dashboard reads like a live, rising funnel: ~60% of
        // captures land inside the window, the rest trail back over 90 days.
        createdAt: new Date(
          now -
            (rnd() < 0.6
              ? Math.floor(rnd() * 14)
              : 14 + Math.floor(rnd() * 76)) *
              24 *
              60 *
              60 *
              1000,
        ),
      });
    }
  }

  await prisma.lead.createMany({ data: leads });
  console.log(
    `Seeded ${leads.length} leads across ${pages.length} landing pages for ${org.name}.`,
  );

  // --- Calls & activity (Calls & comms / Activity tabs) ----------------------
  await Promise.all([
    prisma.callLog.deleteMany({ where: { orgId: org.id } }),
    prisma.activityEvent.deleteMany({ where: { orgId: org.id } }),
  ]);

  const CALL_OUTCOMES: [string, number][] = [
    ['connected', 0.36],
    ['no_answer', 0.2],
    ['callback', 0.14],
    ['missed', 0.12],
    ['busy', 0.08],
    ['booked_visit', 0.1],
  ];

  const HOUR = 60 * 60 * 1000;
  const calls: Prisma.CallLogCreateManyInput[] = [];
  const activity: Prisma.ActivityEventCreateManyInput[] = [];
  const activityTemplates: ((lead: {
    name: string;
    bhk: string;
    project: string;
  }) => { type: ActivityType; text: string })[] = [
    () => ({
      type: 'logged_in',
      text: 'Shift started — morning sales queue ready',
    }),
    ({ name, bhk, project }) => ({
      type: 'closed_deal',
      text: `Closed deal — ${name}, ${bhk} at ${project}`,
    }),
    ({ name, project }) => ({
      type: 'site_visit_booked',
      text: `Site visit booked — ${name}, ${project}`,
    }),
    ({ name, bhk }) => ({
      type: 'call_logged',
      text: `Call with ${name} — follow-up on ${bhk}`,
    }),
    ({ name }) => ({
      type: 'whatsapp_sent',
      text: `Brochure shared on WhatsApp — ${name}`,
    }),
    ({ name }) => ({
      type: 'whatsapp_read',
      text: `${name} read your message on WhatsApp`,
    }),
    ({ name }) => ({
      type: 'note_added',
      text: `Note added — pref Team Tower, views of the lake — ${name}'s lead`,
    }),
    ({ name }) => ({
      type: 'status_updated',
      text: `Moved ${name} to ${pickWeighted(rnd, [
        ['follow_up', 1],
        ['site_visit', 1],
        ['negotiation', 1],
      ] as [string, number][])}`,
    }),
  ];

  for (const agent of AGENTS) {
    const agentId = userIds[agent.email];
    const myLeads = await prisma.lead.findMany({
      where: { orgId: org.id, assignedToId: agentId },
      select: { id: true, data: true },
    });

    const leadFor = () => {
      const lead = myLeads[Math.floor(rnd() * myLeads.length)];
      const record = (lead?.data ?? {}) as Record<string, unknown>;
      const name = typeof record.fullName === 'string' ? record.fullName : null;
      return { id: lead?.id ?? null, name };
    };

    // Calls — a working ratio of the lead book, spaced so the recent-calls
    // table reads newest-first and the whole book fits inside the last ~4
    // days (the "calls made" series on the 14-day chart).
    const callCount = Math.max(8, Math.round(agent.leads / 5));
    for (let i = 0; i < callCount; i++) {
      const { id, name } = leadFor();
      const outcome = pickWeighted(rnd, CALL_OUTCOMES);
      const isConnected = outcome === 'connected' || outcome === 'booked_visit';
      calls.push({
        orgId: org.id,
        agentId,
        leadId: id,
        leadName: name,
        direction: rnd() > 0.85 ? 'incoming' : 'outgoing',
        outcome,
        durationSeconds: isConnected ? 90 + Math.floor(rnd() * 330) : 0,
        createdAt: new Date(now - (i * 6 + Math.floor(rnd() * 5)) * HOUR),
      });
    }

    // Activity — the same 8 event types for every agent, newest-first window.
    activityTemplates.forEach((template, i) => {
      const lead = myLeads[Math.floor(rnd() * myLeads.length)];
      const record = (lead?.data ?? {}) as Record<string, unknown>;
      const name =
        typeof record.fullName === 'string' ? record.fullName : 'Lead';
      const bhk = typeof record.bhk === 'string' ? record.bhk : '3 BHK';
      const project =
        typeof record.project === 'string' ? record.project : 'Palm Residency';
      activity.push({
        orgId: org.id,
        agentId,
        leadId: lead?.id ?? null,
        ...template({ name, bhk, project }),
        createdAt: new Date(now - (i * 11 + Math.floor(rnd() * 6)) * HOUR),
      });
    });
  }

  await prisma.callLog.createMany({ data: calls });
  await prisma.activityEvent.createMany({ data: activity });
  console.log(
    `Seeded ${calls.length} call logs and ${activity.length} activity events across the team.`,
  );
}

async function main() {
  await seedRoles();
  await seedSuperAdmin();
  await seedDemoOrg();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
