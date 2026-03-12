import { prisma } from '../lib/prisma';

const INDIA_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: '2026-01-01', type: 'NATIONAL' as const },
  { name: 'Republic Day', date: '2026-01-26', type: 'NATIONAL' as const },
  { name: 'Holi', date: '2026-03-03', type: 'NATIONAL' as const },
  { name: 'Good Friday', date: '2026-04-03', type: 'NATIONAL' as const },
  { name: 'Dr. Ambedkar Jayanti', date: '2026-04-14', type: 'NATIONAL' as const },
  { name: 'Ram Navami', date: '2026-04-17', type: 'NATIONAL' as const },
  { name: 'Eid ul-Fitr', date: '2026-04-20', type: 'NATIONAL' as const },
  { name: 'Labour Day', date: '2026-05-01', type: 'NATIONAL' as const },
  { name: 'Eid al-Adha', date: '2026-06-27', type: 'NATIONAL' as const },
  { name: 'Independence Day', date: '2026-08-15', type: 'NATIONAL' as const },
  { name: 'Janmashtami', date: '2026-08-23', type: 'NATIONAL' as const },
  { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'NATIONAL' as const },
  { name: 'Dussehra', date: '2026-10-15', type: 'NATIONAL' as const },
  { name: 'Diwali', date: '2026-10-27', type: 'NATIONAL' as const },
  { name: 'Christmas Day', date: '2026-12-25', type: 'NATIONAL' as const },
];

export async function getHolidays(year?: number) {
  const y = year ?? new Date().getFullYear();
  return prisma.holiday.findMany({
    where: { year: y },
    orderBy: { date: 'asc' },
  });
}

export async function addHoliday(data: { name: string; date: string; type?: 'NATIONAL' | 'COMPANY' | 'OPTIONAL' }) {
  const d = new Date(data.date);
  return prisma.holiday.upsert({
    where: { date: d },
    update: { name: data.name, type: data.type ?? 'COMPANY' },
    create: { name: data.name, date: d, type: data.type ?? 'COMPANY', year: d.getFullYear() },
  });
}

export async function deleteHoliday(id: string) {
  return prisma.holiday.delete({ where: { id } });
}

export async function seedNationalHolidays() {
  for (const h of INDIA_HOLIDAYS_2026) {
    const d = new Date(h.date);
    await prisma.holiday.upsert({
      where: { date: d },
      update: {},
      create: { name: h.name, date: d, type: h.type, year: 2026 },
    });
  }
}
