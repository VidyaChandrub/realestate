import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting side-menu seed...');

  // Cleanup for repeatable seed runs
  await prisma.rolePermission.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.role.deleteMany({});

  // 1) Roles
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
  const employerRole = await prisma.role.create({ data: { name: 'EMPLOYER' } });
  const recruiterRole = await prisma.role.create({ data: { name: 'RECRUITER' } });
  const jobSeekerRole = await prisma.role.create({ data: { name: 'JOB_SEEKER' } });

  // 2) Menu Items (group based)
  const dashboardMenu = await prisma.menu.create({
    data: {
      label: 'Dashboard',
      to: '/',
      icon: 'LayoutDashboard',
      groupLabel: 'Overview',
      sortOrder: 1,
    },
  });

  const analyticsMenu = await prisma.menu.create({
    data: {
      label: 'Analytics',
      to: '/analytics',
      icon: 'BarChart3',
      groupLabel: 'Overview',
      sortOrder: 2,
    },
  });

  const usersMenu = await prisma.menu.create({
    data: {
      label: 'Users',
      to: '/users',
      icon: 'Users',
      groupLabel: 'Management',
      sortOrder: 3,
    },
  });

  const employersMenu = await prisma.menu.create({
    data: {
      label: 'Admin Orgs',
      to: '/employers',
      icon: 'Building2',
      groupLabel: 'Management',
      sortOrder: 4,
    },
  });

    // const jobsMenu = await prisma.menu.create({
    //   data: {
    //     label: 'Properties',
    //     to: '/jobs',
    //     icon: 'Briefcase',
    //     groupLabel: 'Management',
    //     sortOrder: 5,
    //   },
    // });

    // const applicationsMenu = await prisma.menu.create({
    //   data: {
    //     label: 'Inquiries',
    //     to: '/applications',
    //     icon: 'FileText',
    //     groupLabel: 'Management',
    //     sortOrder: 6,
    //   },
    // });

  const eventsMenu = await prisma.menu.create({
    data: {
      label: 'Events',
      to: '/events',
      icon: 'Calendar',
      groupLabel: 'Management',
      sortOrder: 7,
    },
  });

  const adsMenu = await prisma.menu.create({
    data: {
      label: 'Advertisements',
      to: '/ads',
      icon: 'Megaphone',
      groupLabel: 'Marketing',
      sortOrder: 8,
    },
  });

  const masterDataMenu = await prisma.menu.create({
    data: {
      label: 'Master Data',
      to: '/master-data',
      icon: 'Database',
      groupLabel: 'System',
      sortOrder: 9,
    },
  });

  const contentMenu = await prisma.menu.create({
    data: {
      label: 'Content',
      to: '/content',
      icon: 'HelpCircle',
      groupLabel: 'System',
      sortOrder: 10,
    },
  });

  const notificationsMenu = await prisma.menu.create({
    data: {
      label: 'Notifications',
      to: '/notifications',
      icon: 'Bell',
      groupLabel: 'System',
      sortOrder: 11,
    },
  });

  // 3) Role Permissions (mapping roles to menus)
  const allMenus = [
    dashboardMenu,
    analyticsMenu,
    usersMenu,
    employersMenu,
    // jobsMenu,
    // applicationsMenu,
    eventsMenu,
    adsMenu,
    masterDataMenu,
    contentMenu,
    notificationsMenu,
    // jobScrapperMenu,
    // keywordConfigMenu,
    // fetchedJobsMenu,
  ];

  for (const menu of allMenus) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        menuId: menu.id,
      },
    });
  }

  const employerMenus = [
    dashboardMenu,
    // jobsMenu,
    // applicationsMenu,
    eventsMenu,
  ];

  for (const menu of employerMenus) {
    await prisma.rolePermission.create({ data: { roleId: employerRole.id, menuId: menu.id } });
  }

  const recruiterMenus = [
    dashboardMenu,
    analyticsMenu,
    employersMenu,
    // jobsMenu,
    // applicationsMenu,
    eventsMenu,
  ];

  for (const menu of recruiterMenus) {
    await prisma.rolePermission.create({ data: { roleId: recruiterRole.id, menuId: menu.id } });
  }

  const jobSeekerMenus = [
    dashboardMenu,
    analyticsMenu,
    // jobsMenu,
    // applicationsMenu,
    eventsMenu,
  ];

  for (const menu of jobSeekerMenus) {
    await prisma.rolePermission.create({ data: { roleId: jobSeekerRole.id, menuId: menu.id } });
  }

  console.log('✅ Side-menu seed completed successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Side-menu seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });