/**
 * Data migration: copy all application data from a SOURCE PostgreSQL
 * database to the TARGET database that this project is currently configured
 * against (via DATABASE_URL).
 *
 * The script assumes both databases share the same Prisma schema. Run
 * `npx prisma db push` against the TARGET first to apply the schema.
 *
 * Usage (PowerShell):
 *   $env:SOURCE_DATABASE_URL = "postgresql://user:pass@source-host:6543/postgres?pgbouncer=true"
 *   npm run db:migrate
 *
 * The script is idempotent — rows that already exist in the target (matched
 * by primary key) are skipped, so it can be re-run safely.
 *
 * Tables transferred (in foreign-key-safe order):
 *   1. Department
 *   2. LeaveType
 *   3. Holiday
 *   4. CustomRole + RoleModulePermission
 *   5. User (two-pass: insert without managerId, then patch managerId)
 *   6. UserProfile, Skill, Certification, KRADocument
 *   7. Attendance + AttendanceRegularization
 *   8. Leave, CompOff
 *   9. OnboardingTask
 *  10. Asset + AssetAssignment
 *  11. ITProvision
 *  12. Announcement
 *  13. AuditLog, ErrorLog
 *
 * The following tables are intentionally NOT copied — they are transient
 * authentication artefacts that should be regenerated on the target:
 *   - OTP
 *   - RefreshToken
 */

import { PrismaClient } from '@prisma/client';

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;

if (!SOURCE_DATABASE_URL) {
  console.error('✗ SOURCE_DATABASE_URL is not set.');
  console.error('  Set it to the source database connection string, e.g.');
  console.error('  $env:SOURCE_DATABASE_URL = "postgresql://user:pass@host:6543/postgres?pgbouncer=true"');
  process.exit(1);
}

const source = new PrismaClient({ datasourceUrl: SOURCE_DATABASE_URL });
const target = new PrismaClient();

const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function copy<T>(label: string, fetch: () => Promise<T[]>, insert: (rows: T[]) => Promise<unknown>) {
  const rows = await fetch();
  if (rows.length === 0) {
    console.log(`  ${label.padEnd(28)} — nothing to copy`);
    return 0;
  }
  let written = 0;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    await insert(batch);
    written += batch.length;
  }
  console.log(`  ${label.padEnd(28)} ${written} row(s) copied`);
  return written;
}

async function main() {
  console.log('Atlas data migration');
  console.log('────────────────────');
  console.log('  Source: ', SOURCE_DATABASE_URL!.replace(/:[^:@]+@/, ':***@'));
  console.log('  Target: ', (process.env.DATABASE_URL ?? '').replace(/:[^:@]+@/, ':***@'));
  console.log('');

  // Smoke-test both connections up front so the script fails fast.
  await source.$queryRaw`SELECT 1`;
  await target.$queryRaw`SELECT 1`;

  console.log('▸ Reference data');

  await copy(
    'Department',
    () => source.department.findMany(),
    (rows) => target.department.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'LeaveType',
    () => source.leaveType.findMany(),
    (rows) => target.leaveType.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'Holiday',
    () => source.holiday.findMany(),
    (rows) => target.holiday.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ RBAC');

  await copy(
    'CustomRole',
    () => source.customRole.findMany(),
    (rows) => target.customRole.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'RoleModulePermission',
    () => source.roleModulePermission.findMany(),
    (rows) => target.roleModulePermission.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Users (two-pass to handle self-referential manager FK)');

  // Pass 1: insert users without managerId to side-step the self-FK constraint.
  const users = await source.user.findMany();
  const usersWithoutManager = users.map((u) => ({ ...u, managerId: null }));
  let userPass1 = 0;
  for (const batch of chunk(usersWithoutManager, BATCH_SIZE)) {
    const res = await target.user.createMany({ data: batch, skipDuplicates: true });
    userPass1 += res.count;
  }
  console.log(`  User (pass 1: no manager)    ${userPass1} row(s) inserted`);

  // Pass 2: patch managerId now that every user exists.
  let userPass2 = 0;
  for (const u of users) {
    if (!u.managerId) continue;
    await target.user.update({ where: { id: u.id }, data: { managerId: u.managerId } });
    userPass2++;
  }
  console.log(`  User (pass 2: manager link)  ${userPass2} row(s) updated`);

  console.log('▸ Profile data');

  await copy(
    'UserProfile',
    () => source.userProfile.findMany(),
    (rows) => target.userProfile.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'Skill',
    () => source.skill.findMany(),
    (rows) => target.skill.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'Certification',
    () => source.certification.findMany(),
    (rows) => target.certification.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'KRADocument',
    () => source.kRADocument.findMany(),
    (rows) => target.kRADocument.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Attendance');

  await copy(
    'Attendance',
    () => source.attendance.findMany(),
    (rows) => target.attendance.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'AttendanceRegularization',
    () => source.attendanceRegularization.findMany(),
    (rows) => target.attendanceRegularization.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Leaves');

  await copy(
    'Leave',
    () => source.leave.findMany(),
    (rows) => target.leave.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'CompOff',
    () => source.compOff.findMany(),
    (rows) => target.compOff.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Onboarding');

  await copy(
    'OnboardingTask',
    () => source.onboardingTask.findMany(),
    (rows) => target.onboardingTask.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'Asset',
    () => source.asset.findMany(),
    (rows) => target.asset.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'AssetAssignment',
    () => source.assetAssignment.findMany(),
    (rows) => target.assetAssignment.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'ITProvision',
    () => source.iTProvision.findMany(),
    (rows) => target.iTProvision.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Announcements');

  await copy(
    'Announcement',
    () => source.announcement.findMany(),
    (rows) => target.announcement.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('▸ Logs');

  await copy(
    'AuditLog',
    () => source.auditLog.findMany(),
    (rows) => target.auditLog.createMany({ data: rows, skipDuplicates: true }),
  );

  await copy(
    'ErrorLog',
    () => source.errorLog.findMany(),
    (rows) => target.errorLog.createMany({ data: rows, skipDuplicates: true }),
  );

  console.log('');
  console.log('✓ Migration complete.');
  console.log('');
  console.log('Note: OTPs and refresh tokens were intentionally not copied.');
  console.log('Users will receive a fresh OTP on their next sign-in attempt.');
}

main()
  .catch((err) => {
    console.error('');
    console.error('✗ Migration failed:');
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
