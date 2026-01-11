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
  const permissionApis = [
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/bans',
  ];

  const createdPermissions = [];
  for (const api of permissionApis) {
    const existing = await prisma.permission.findFirst({
      where: { api },
    });

    if (!existing) {
      const created = await prisma.permission.create({ data: { api } });
      createdPermissions.push(created);
      console.log(`✅ Created permission: ${api}`);
    } else {
      createdPermissions.push(existing);
      console.log(`⏭️  Permission already exists: ${api}`);
    }
  }

  console.log('\n👥 Creating roles...');
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  let adminRoleId;

  if (!adminRole) {
    const created = await prisma.role.create({
      data: { name: 'Admin' },
    });
    adminRoleId = created.id;
    console.log('✅ Created role: Admin');
  } else {
    adminRoleId = adminRole.id;
    console.log('⏭️  Role already exists: Admin');
  }

  const userRole = await prisma.role.findFirst({ where: { name: 'User' } });
  let userRoleId;

  if (!userRole) {
    const created = await prisma.role.create({
      data: { name: 'User' },
    });
    userRoleId = created.id;
    console.log('✅ Created role: User');
  } else {
    userRoleId = userRole.id;
    console.log('⏭️  Role already exists: User');
  }

  console.log('\n🔗 Creating role-permission mappings...');
  // Admin có tất cả permissions với tất cả methods
  for (const permission of createdPermissions) {
    const existing = await prisma.rolePermission.findFirst({
      where: { roleId: adminRoleId, permissionId: permission.id },
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRoleId,
          permissionId: permission.id,
          methods: 'GET|POST|PUT|DELETE|PATCH',
        },
      });
      console.log(`✅ Admin -> ${permission.api} [ALL methods]`);
    } else {
      console.log(`⏭️  Admin -> ${permission.api} [already exists]`);
    }
  }

  // User chỉ có quyền GET /api/users/:id
  const userPermission = createdPermissions.find(p => p.api === '/api/users/:id');
  if (userPermission) {
    const existing = await prisma.rolePermission.findFirst({
      where: { roleId: userRoleId, permissionId: userPermission.id },
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: {
          roleId: userRoleId,
          permissionId: userPermission.id,
          methods: 'GET',
        },
      });
      console.log(`✅ User -> ${userPermission.api} [GET]`);
    } else {
      console.log(`⏭️  User -> ${userPermission.api} [already exists]`);
    }
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