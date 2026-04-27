import { prisma } from '../lib/prisma';
import { OnboardingTaskStatus, ITProvisionStatus, AssetStatus } from '@prisma/client';

const DEFAULT_TASKS = [
  { title: 'Complete paperwork & contracts', category: 'HR', dueDay: 1, responsibleRole: 'HR', description: 'Sign employment contract, NDA, and other HR documents' },
  { title: 'Office tour & introductions', category: 'HR', dueDay: 1, responsibleRole: 'HR', description: 'Meet the team and get familiar with office layout' },
  { title: 'Setup email account', category: 'IT', dueDay: 1, responsibleRole: 'IT', description: 'Corporate email account creation and configuration' },
  { title: 'Laptop setup & software installation', category: 'IT', dueDay: 2, responsibleRole: 'IT', description: 'Install required tools: IDE, Slack, VPN, etc.' },
  { title: 'VPN & network access', category: 'IT', dueDay: 2, responsibleRole: 'IT', description: 'Setup VPN credentials and test remote access' },
  { title: 'Access card & building entry', category: 'IT', dueDay: 1, responsibleRole: 'IT', description: 'Issue access card and register biometrics' },
  { title: 'Meet with direct manager', category: 'Manager', dueDay: 1, responsibleRole: 'MANAGER', description: 'Discuss role expectations, team structure, and 30-day goals' },
  { title: 'Review team processes & tools', category: 'Manager', dueDay: 3, responsibleRole: 'MANAGER', description: 'Walkthrough of workflows, code repos, project management tools' },
  { title: 'HR policy orientation', category: 'HR', dueDay: 3, responsibleRole: 'HR', description: 'Review leave policy, code of conduct, benefits' },
  { title: 'Complete compliance training', category: 'HR', dueDay: 7, responsibleRole: 'EMPLOYEE', description: 'POSH, data security, and compliance e-learning modules' },
  { title: 'Setup Slack & communication tools', category: 'IT', dueDay: 2, responsibleRole: 'IT', description: 'Join team channels and configure notifications' },
  { title: 'GitHub / code repository access', category: 'IT', dueDay: 3, responsibleRole: 'IT', description: 'Add to relevant repos and set permissions' },
  { title: 'First project assignment', category: 'Manager', dueDay: 7, responsibleRole: 'MANAGER', description: 'Assign starter task or shadow session' },
  { title: '15-day check-in with HR', category: 'HR', dueDay: 15, responsibleRole: 'HR', description: 'Mid-onboarding feedback and support session' },
  { title: '30-day review with manager', category: 'Manager', dueDay: 30, responsibleRole: 'MANAGER', description: 'End of onboarding review, set 60/90 day goals' },
];

const DEFAULT_IT_ITEMS = [
  'Corporate Email',
  'Slack',
  'VPN Access',
  'GitHub / GitLab',
  'Jira / Project Tool',
  'Google Workspace / Microsoft 365',
  'POD-Atlas Portal Access',
  'Cloud Console Access',
];

export async function initOnboarding(userId: string) {
  // Create default checklist tasks
  await prisma.onboardingTask.createMany({
    data: DEFAULT_TASKS.map(t => ({ ...t, userId })),
  });
  // Create default IT provisions
  await prisma.iTProvision.createMany({
    data: DEFAULT_IT_ITEMS.map(item => ({ item, userId })),
  });
  return { tasksCreated: DEFAULT_TASKS.length, itItemsCreated: DEFAULT_IT_ITEMS.length };
}

export async function getOnboarding(userId: string) {
  const [tasks, itProvisions, assetAssignments] = await Promise.all([
    prisma.onboardingTask.findMany({ where: { userId }, orderBy: { dueDay: 'asc' } }),
    prisma.iTProvision.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.assetAssignment.findMany({
      where: { userId, returnedAt: null },
      include: { asset: true },
      orderBy: { assignedAt: 'desc' },
    }),
  ]);
  return { tasks, itProvisions, assetAssignments };
}

export async function updateTask(id: string, status: OnboardingTaskStatus, notes?: string) {
  return prisma.onboardingTask.update({
    where: { id },
    data: {
      status,
      notes,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      updatedAt: new Date(),
    },
  });
}

export async function addTask(userId: string, data: { title: string; description?: string; category: string; dueDay: number; responsibleRole?: string }) {
  return prisma.onboardingTask.create({ data: { ...data, userId } });
}

export async function deleteTask(id: string) {
  return prisma.onboardingTask.delete({ where: { id } });
}

// Assets
export async function listAssets(status?: AssetStatus) {
  return prisma.asset.findMany({
    where: status ? { status } : undefined,
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addAsset(data: { type: string; name: string; serialNumber?: string; model?: string; notes?: string }) {
  return prisma.asset.create({ data: data as any });
}

export async function assignAsset(assetId: string, userId: string, assignedById: string, condition?: string, notes?: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error('Asset not found');
  if (asset.status === 'ASSIGNED') throw new Error('Asset already assigned');

  const [assignment] = await prisma.$transaction([
    prisma.assetAssignment.create({
      data: { assetId, userId, assignedById, condition, notes },
      include: { asset: true, user: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED' } }),
  ]);
  return assignment;
}

export async function returnAsset(assignmentId: string) {
  const assignment = await prisma.assetAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new Error('Assignment not found');

  await prisma.$transaction([
    prisma.assetAssignment.update({ where: { id: assignmentId }, data: { returnedAt: new Date() } }),
    prisma.asset.update({ where: { id: assignment.assetId }, data: { status: 'AVAILABLE' } }),
  ]);
}

export async function getUserAssets(userId: string) {
  return prisma.assetAssignment.findMany({
    where: { userId },
    include: { asset: true },
    orderBy: { assignedAt: 'desc' },
  });
}

// IT Provisions
export async function listITProvisions(userId?: string) {
  return prisma.iTProvision.findMany({
    where: userId ? { userId } : undefined,
    include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateITProvision(id: string, status: ITProvisionStatus, notes?: string) {
  return prisma.iTProvision.update({
    where: { id },
    data: {
      status,
      notes,
      completedAt: status === 'DONE' ? new Date() : null,
      updatedAt: new Date(),
    },
  });
}

export async function addITProvision(userId: string, item: string) {
  return prisma.iTProvision.create({ data: { userId, item } });
}
