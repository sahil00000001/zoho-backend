import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';

const USER_SELECT = {
  id: true,
  employeeId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  designation: true,
  phoneNumber: true,
  joiningDate: true,
  isActive: true,
  departmentId: true,
  managerId: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
};

export async function getAllUsers(filters?: { role?: string; departmentId?: string; isActive?: boolean; search?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.role) where.role = filters.role;
  if (filters?.departmentId) where.departmentId = filters.departmentId;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { employeeId: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: USER_SELECT,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_SELECT,
      subordinates: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true } },
      _count: { select: { attendances: true, leaves: true } },
    },
  });
  if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError('EMAIL_EXISTS', 'A user with this email already exists', 409);

  // Generate employee ID
  const count = await prisma.user.count();
  const employeeId = `EMP${String(count + 1).padStart(3, '0')}`;

  return prisma.user.create({
    data: {
      ...input,
      employeeId,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
    },
    select: USER_SELECT,
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

  return prisma.user.update({
    where: { id },
    data: {
      ...input,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
    },
    select: USER_SELECT,
  });
}

export async function deactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: USER_SELECT,
  });
}

export async function getDepartments() {
  return prisma.department.findMany({ orderBy: { name: 'asc' } });
}
