import { prisma } from '../lib/prisma';

export async function getProfile(userId: string) {
  const [user, profile, skills, certifications, kraDocuments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, employeeId: true, email: true,
        firstName: true, lastName: true,
        role: true, designation: true, phoneNumber: true,
        joiningDate: true, isActive: true,
        department: true, manager: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.certification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.kRADocument.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } }),
  ]);
  return { user, profile, skills, certifications, kraDocuments };
}

export async function upsertProfile(userId: string, data: {
  photoUrl?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  dateOfBirth?: string;
}) {
  const { dateOfBirth, ...rest } = data;
  const profileData = {
    ...rest,
    ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined } : {}),
  };
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: { ...profileData, updatedAt: new Date() },
  });
}

export async function updateBasicInfo(userId: string, data: {
  phoneNumber?: string;
  designation?: string;
}) {
  return prisma.user.update({ where: { id: userId }, data });
}

export async function addSkill(userId: string, name: string, level?: string) {
  return prisma.skill.create({ data: { userId, name, level } });
}

export async function deleteSkill(id: string, userId: string) {
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill || skill.userId !== userId) throw new Error('Not found');
  return prisma.skill.delete({ where: { id } });
}

export async function addCertification(userId: string, data: {
  name: string; issuer?: string; issueDate?: string;
  expiryDate?: string; credentialId?: string;
}) {
  return prisma.certification.create({
    data: {
      userId,
      name: data.name,
      issuer: data.issuer,
      credentialId: data.credentialId,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
  });
}

export async function deleteCertification(id: string, userId: string) {
  const cert = await prisma.certification.findUnique({ where: { id } });
  if (!cert || cert.userId !== userId) throw new Error('Not found');
  return prisma.certification.delete({ where: { id } });
}

export async function addKRADocument(userId: string, data: {
  title: string; period?: string; fileUrl: string; fileName: string; fileSize?: number; mimeType?: string;
}) {
  return prisma.kRADocument.create({ data: { userId, ...data } });
}

export async function deleteKRADocument(id: string, userId: string) {
  const doc = await prisma.kRADocument.findUnique({ where: { id } });
  if (!doc || doc.userId !== userId) throw new Error('Not found');
  return prisma.kRADocument.delete({ where: { id } });
}

export async function getKRADocuments(userId: string) {
  return prisma.kRADocument.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } });
}

// HR/Admin: get all employees' KRA documents
export async function getAllKRADocuments() {
  return prisma.kRADocument.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  });
}
