require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting database initialization...');

  console.log('📝 Creating permissions...');
  const permissions = [
    { api: '/api/users', method: 'GET|POST' },
    { api: '/api/users/:id', method: 'GET|PUT|DELETE' },
    { api: '/api/roles', method: 'GET|POST' },
    { api: '/api/roles/:id', method: 'GET|PUT|DELETE' },
    { api: '/api/permissions', method: 'GET|POST' },
    { api: '/api/bans', method: 'GET|POST' },
    { api: '/api/bans/:id', method: 'GET|PUT|DELETE' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const existing = await prisma.permission.findFirst({
      where: { api: perm.api, method: perm.method },
    });

    if (!existing) {
      const created = await prisma.permission.create({ data: perm });
      createdPermissions.push(created);
      console.log(`✅ Created permission: ${perm.method} ${perm.api}`);
    } else {
      createdPermissions.push(existing);
      console.log(`⏭️  Permission already exists: ${perm.method} ${perm.api}`);
    }
  }

  console.log('\n👥 Creating roles...');
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  let adminRoleId;

  if (!adminRole) {
    const created = await prisma.role.create({
      data: {
        name: 'Admin',
        permissions: {
          connect: createdPermissions.map(p => ({ id: p.id })),
        },
      },
    });
    adminRoleId = created.id;
    console.log('✅ Created role: Admin with all permissions');
  } else {
    adminRoleId = adminRole.id;
    console.log('⏭️  Role already exists: Admin');
  }

  const userRole = await prisma.role.findFirst({ where: { name: 'User' } });
  let userRoleId;

  if (!userRole) {
    const userPermissions = createdPermissions.filter(p =>
      p.api.includes('/api/users/:id') && p.method.includes('GET')
    );
    const created = await prisma.role.create({
      data: {
        name: 'User',
        permissions: {
          connect: userPermissions.map(p => ({ id: p.id })),
        },
      },
    });
    userRoleId = created.id;
    console.log('✅ Created role: User with limited permissions');
  } else {
    userRoleId = userRole.id;
    console.log('⏭️  Role already exists: User');
  }

  console.log('\n🚫 Creating ban records...');
  const banReasons = [
    { reason: 'Spam content' },
    { reason: 'Inappropriate behavior' },
  ];

  const createdBans = [];
  for (const ban of banReasons) {
    const existing = await prisma.ban.findFirst({
      where: { reason: ban.reason, isDeleted: false },
    });

    if (!existing) {
      const created = await prisma.ban.create({ data: ban });
      createdBans.push(created);
      console.log(`✅ Created ban: ${ban.reason}`);
    } else {
      createdBans.push(existing);
      console.log(`⏭️  Ban already exists: ${ban.reason}`);
    }
  }

  console.log('\n👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
  if (!adminUser) {
    await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        roleId: adminRoleId,
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    });
    console.log('✅ Created user: admin@example.com');
  } else {
    console.log('⏭️  User already exists: admin@example.com');
  }

  const normalUser = await prisma.user.findFirst({ where: { email: 'user@example.com' } });
  if (!normalUser) {
    await prisma.user.create({
      data: {
        fullName: 'Normal User',
        email: 'user@example.com',
        password: hashedPassword,
        roleId: userRoleId,
        avatar: 'https://i.pravatar.cc/150?img=2',
      },
    });
    console.log('✅ Created user: user@example.com');
  } else {
    console.log('⏭️  User already exists: user@example.com');
  }

  const bannedUser = await prisma.user.findFirst({ where: { email: 'banned@example.com' } });
  if (!bannedUser) {
    await prisma.user.create({
      data: {
        fullName: 'Banned User',
        email: 'banned@example.com',
        password: hashedPassword,
        roleId: userRoleId,
        banId: createdBans[0].id,
        timeBan: new Date(),
        timeUnBan: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
        avatar: 'https://i.pravatar.cc/150?img=3',
      },
    });
    console.log('✅ Created user: banned@example.com (with ban)');
  } else {
    console.log('⏭️  User already exists: banned@example.com');
  }

  console.log('\n✨ Database initialization completed!');
  console.log('\n📋 Summary:');
  console.log('   - Permissions: 7 records');
  console.log('   - Roles: 2 records (Admin, User)');
  console.log('   - Bans: 2 records');
  console.log('   - Users: 3 records');
  console.log('\n🔑 Login credentials:');
  console.log('   Admin: admin@example.com / password123');
  console.log('   User: user@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });