import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const ALL_MODULES = [
  { key: 'dashboard',     name: 'Dashboard',      icon: '⊞' },
  { key: 'attendance',    name: 'Attendance',      icon: '🕐' },
  { key: 'leaves',        name: 'Leaves',          icon: '🌿' },
  { key: 'announcements', name: 'Announcements',   icon: '📢' },
  { key: 'directory',     name: 'Directory',       icon: '👥' },
  { key: 'profile',       name: 'My Profile',      icon: '👤' },
  { key: 'onboarding',    name: 'Onboarding',      icon: '🚀' },
  { key: 'approvals',     name: 'Approvals',       icon: '✅' },
  { key: 'documents',     name: 'Documents',       icon: '📁' },
  { key: 'users',         name: 'User Management', icon: '⚙️' },
  { key: 'roles',         name: 'Role Management', icon: '🔑' },
  { key: 'audit',         name: 'Audit Logs',      icon: '📋' },
];

export async function listRoles() {
  return prisma.customRole.findMany({
    include: { modulePermissions: true, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getRoleById(id: string) {
  const role = await prisma.customRole.findUnique({
    where: { id },
    include: { modulePermissions: true, _count: { select: { users: true } } },
  });
  if (!role) throw new AppError('NOT_FOUND', 'Role not found', 404);
  return role;
}

export async function createRole(data: {
  name: string;
  description?: string;
  basePermissionLevel: string;
  color?: string;
  moduleKeys: string[];
}) {
  const existing = await prisma.customRole.findUnique({ where: { name: data.name } });
  if (existing) throw new AppError('CONFLICT', 'A role with this name already exists', 409);

  return prisma.customRole.create({
    data: {
      name: data.name,
      description: data.description,
      basePermissionLevel: data.basePermissionLevel as any,
      color: data.color ?? '#6366f1',
      modulePermissions: {
        create: data.moduleKeys.map(key => ({ moduleKey: key, canAccess: true })),
      },
    },
    include: { modulePermissions: true },
  });
}

export async function updateRole(id: string, data: {
  name?: string;
  description?: string;
  basePermissionLevel?: string;
  color?: string;
  moduleKeys?: string[];
}) {
  const role = await prisma.customRole.findUnique({ where: { id } });
  if (!role) throw new AppError('NOT_FOUND', 'Role not found', 404);
  if (role.isSystem && data.basePermissionLevel && data.basePermissionLevel !== role.basePermissionLevel) {
    throw new AppError('FORBIDDEN', 'Cannot change permission level of system roles', 403);
  }

  await prisma.$transaction(async (tx) => {
    if (data.moduleKeys !== undefined) {
      await tx.roleModulePermission.deleteMany({ where: { customRoleId: id } });
      await tx.roleModulePermission.createMany({
        data: data.moduleKeys.map(key => ({ customRoleId: id, moduleKey: key, canAccess: true })),
      });
    }
    await tx.customRole.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        basePermissionLevel: data.basePermissionLevel as any,
        color: data.color,
      },
    });
  });

  return getRoleById(id);
}

export async function deleteRole(id: string) {
  const role = await prisma.customRole.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw new AppError('NOT_FOUND', 'Role not found', 404);
  if (role.isSystem) throw new AppError('FORBIDDEN', 'Cannot delete system roles', 403);
  if (role._count.users > 0) throw new AppError('CONFLICT', 'Cannot delete role with assigned users', 409);
  return prisma.customRole.delete({ where: { id } });
}

export async function getMyPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customRole: { include: { modulePermissions: true } } },
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  if (user.customRole) {
    return {
      customRole: { id: user.customRole.id, name: user.customRole.name, color: user.customRole.color },
      modules: user.customRole.modulePermissions
        .filter(p => p.canAccess)
        .map(p => p.moduleKey),
    };
  }

  // Fallback: default module access based on base role
  const defaultModules: Record<string, string[]> = {
    ADMIN: ALL_MODULES.map(m => m.key),
    HR: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'approvals', 'documents', 'users'],
    MANAGER: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'approvals', 'documents'],
    EMPLOYEE: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'documents'],
  };

  return {
    customRole: null,
    modules: defaultModules[user.role] ?? defaultModules.EMPLOYEE,
  };
}

export async function seedSystemRoles() {
  const existing = await prisma.customRole.count();
  if (existing > 0) return;

  const systemRoles = [
    { name: 'Employee', basePermissionLevel: 'EMPLOYEE', color: '#6366f1', isSystem: true,
      modules: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'documents'] },
    { name: 'Manager', basePermissionLevel: 'MANAGER', color: '#0ea5e9', isSystem: true,
      modules: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'approvals', 'documents'] },
    { name: 'HR Manager', basePermissionLevel: 'HR', color: '#10b981', isSystem: true,
      modules: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'approvals', 'documents', 'users'] },
    { name: 'L&D Manager', basePermissionLevel: 'HR', color: '#f59e0b', isSystem: false,
      modules: ['dashboard', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'documents'] },
    { name: 'Recruitment Team', basePermissionLevel: 'HR', color: '#8b5cf6', isSystem: false,
      modules: ['dashboard', 'announcements', 'directory', 'org-chart', 'profile', 'documents', 'users'] },
    { name: 'Payroll HR', basePermissionLevel: 'HR', color: '#ef4444', isSystem: false,
      modules: ['dashboard', 'attendance', 'leaves', 'directory', 'org-chart', 'profile', 'documents'] },
    { name: 'Admin', basePermissionLevel: 'ADMIN', color: '#dc2626', isSystem: true,
      modules: ['dashboard', 'attendance', 'leaves', 'announcements', 'directory', 'org-chart', 'profile', 'onboarding', 'approvals', 'documents', 'users', 'roles', 'audit'] },
  ];

  for (const r of systemRoles) {
    await prisma.customRole.create({
      data: {
        name: r.name,
        basePermissionLevel: r.basePermissionLevel as any,
        color: r.color,
        isSystem: r.isSystem,
        modulePermissions: { create: r.modules.map(key => ({ moduleKey: key, canAccess: true })) },
      },
    });
  }
  console.log('[Seed] System roles created');
}

// Adds missing module keys to ALL existing roles — safe to run on every startup
export async function patchMissingModules(moduleKey: string) {
  const roles = await prisma.customRole.findMany({ include: { modulePermissions: true } });
  for (const role of roles) {
    const has = role.modulePermissions.some(p => p.moduleKey === moduleKey);
    if (!has) {
      await prisma.roleModulePermission.create({
        data: { customRoleId: role.id, moduleKey, canAccess: true },
      });
      console.log(`[Patch] Added '${moduleKey}' to role: ${role.name}`);
    }
  }
}
