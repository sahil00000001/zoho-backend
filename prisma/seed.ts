import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Departments ──────────────────────────────────────────────
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: { name: 'Engineering' },
    }),
    prisma.department.upsert({
      where: { name: 'Human Resources' },
      update: {},
      create: { name: 'Human Resources' },
    }),
    prisma.department.upsert({
      where: { name: 'Finance' },
      update: {},
      create: { name: 'Finance' },
    }),
    prisma.department.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: { name: 'Marketing' },
    }),
  ]);

  console.log(`✓ ${departments.length} departments seeded`);

  // ── Leave Types ──────────────────────────────────────────────
  const leaveTypes = await Promise.all([
    prisma.leaveType.upsert({
      where: { name: 'Annual Leave' },
      update: {},
      create: { name: 'Annual Leave', description: 'Yearly paid leave', maxDays: 21 },
    }),
    prisma.leaveType.upsert({
      where: { name: 'Sick Leave' },
      update: {},
      create: { name: 'Sick Leave', description: 'Medical leave with doctor certificate', maxDays: 14 },
    }),
    prisma.leaveType.upsert({
      where: { name: 'Casual Leave' },
      update: {},
      create: { name: 'Casual Leave', description: 'Short casual leave for personal matters', maxDays: 7 },
    }),
    prisma.leaveType.upsert({
      where: { name: 'Maternity Leave' },
      update: {},
      create: { name: 'Maternity Leave', description: 'Leave for new mothers', maxDays: 90 },
    }),
  ]);

  console.log(`✓ ${leaveTypes.length} leave types seeded`);

  // ── Admin User ───────────────────────────────────────────────
  const adminDept = departments[1]; // HR
  const admin = await prisma.user.upsert({
    where: { email: 'sahil.vashisht@podtech.com' },
    update: {},
    create: {
      employeeId: 'EMP000',
      email: 'sahil.vashisht@podtech.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      designation: 'System Administrator',
      departmentId: adminDept.id,
      joiningDate: new Date('2023-01-01'),
      isActive: true,
    },
  });

  console.log(`✓ Admin user seeded: ${admin.email}`);
  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
