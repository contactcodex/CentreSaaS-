import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: Request) {
  try {
    const auth = await getCentreAuth(request as any);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    const where = { centreId };
    const studentWhere = { ...where, status: 'active' };
    const teacherWhere = { ...where, status: 'active' };

    const totalStudents = await db.student.count({ where });
    const activeStudents = await db.student.count({ where: studentWhere });
    const totalTeachers = await db.teacher.count({ where });
    const activeTeachers = await db.teacher.count({ where: teacherWhere });
    const totalClassrooms = await db.classroom.count({ where });
    const totalPayments = await db.payment.count({ where: { student: { centreId } } });
    const paidPayments = await db.payment.count({ where: { student: { centreId }, status: 'paid' } });

    const revenueResult = await db.payment.aggregate({
      _sum: { paidAmount: true, amount: true, remainingAmount: true },
      where: { student: { centreId } },
    });
    const totalRevenue = revenueResult._sum.paidAmount || 0;
    const totalExpected = revenueResult._sum.amount || 0;
    const totalRemaining = revenueResult._sum.remainingAmount || 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthlyPayments = await db.payment.findMany({
      where: { year: currentYear, student: { centreId } },
      select: { month: true, paidAmount: true, amount: true, remainingAmount: true, packMonths: true, student: { select: { level: { select: { subject: { select: { serviceId: true } } } } } } },
    });

    const monthNameToNumber: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12 };
    const monthlyStats: Record<string, { revenue: number; expected: number; remaining: number; count: number }> = {};
    for (const p of monthlyPayments) {
      const monthNum = monthNameToNumber[p.month] || parseInt(p.month);
      const key = String(monthNum);
      if (!monthlyStats[key]) monthlyStats[key] = { revenue: 0, expected: 0, remaining: 0, count: 0 };
      const serviceId = p.student?.level?.subject?.serviceId || '';
      const packMonths = (p.packMonths || 1);
      const divisor = packMonths > 1 ? packMonths : 1;
      monthlyStats[key].revenue += p.paidAmount / divisor;
      monthlyStats[key].expected += p.amount / divisor;
      monthlyStats[key].remaining += p.remainingAmount / divisor;
      monthlyStats[key].count += 1;
    }

    const currentMonthStats = monthlyStats[String(currentMonth)] || { revenue: 0, expected: 0, remaining: 0 };
    const monthlyIncome = currentMonthStats.revenue;

    const teacherPaymentsThisYear = await db.teacherPayment.aggregate({ _sum: { amount: true }, where: { year: currentYear, teacher: { centreId } } });
    const teacherPaymentsTotal = teacherPaymentsThisYear._sum.amount || 0;

    const monthlyTeacherPaymentsData = await db.teacherPayment.findMany({ where: { year: currentYear, teacher: { centreId } }, select: { month: true, amount: true } });
    const monthlyTeacherPayments: Record<string, number> = {};
    for (const tp of monthlyTeacherPaymentsData) {
      const monthNum = monthNameToNumber[tp.month] || parseInt(tp.month);
      monthlyTeacherPayments[String(monthNum)] = (monthlyTeacherPayments[String(monthNum)] || 0) + tp.amount;
    }

    const recentPayments = await db.payment.findMany({
      where: { student: { centreId } }, take: 10,
      include: { student: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const recentStudents = await db.student.findMany({
      where: { centreId }, take: 5,
      include: { level: { include: { subject: { include: { service: true } } } }, teacher: true },
      orderBy: { enrollmentDate: 'desc' },
    });

    const teacherPaymentStats = await db.teacherPayment.aggregate({ _sum: { amount: true }, where: { teacher: { centreId } } });

    const jsDay = new Date().getDay();
    const scheduleDayOfWeek = jsDay === 0 ? '1' : String(jsDay + 1);
    const nowCasablanca = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    const todaySessions = await db.schedule.findMany({
      where: { dayOfWeek: scheduleDayOfWeek, subject: { service: { centreId } }, OR: [{ sessionType: 'fixed' }, { sessionType: 'trial', trialDate: { gte: nowCasablanca } }, { sessionType: 'trial', trialDate: null }] },
      include: { subject: { include: { service: true } }, teacher: true, classroom: true, level: true },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      totalStudents, activeStudents, totalTeachers, activeTeachers, totalClassrooms,
      totalPayments, paidPayments, pendingPayments: totalPayments - paidPayments,
      totalRevenue, totalExpected, totalRemaining, monthlyStats, monthlyIncome,
      currentYear, currentMonth, recentPayments, recentStudents,
      totalTeacherPayments: teacherPaymentStats._sum.amount || 0,
      teacherPaymentsThisYear: teacherPaymentsTotal, monthlyTeacherPayments, todaySessions,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
