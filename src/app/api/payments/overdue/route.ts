import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { centreId } = auth.auth;

    // Get all active students with their enrollments and payments
    const students = await db.student.findMany({
      where: { status: 'active', centreId },
      include: {
        level: { include: { subject: { include: { service: true } } } },
        enrollments: { include: { level: { include: { subject: { include: { service: true } } } }, teacher: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Build overdue data grouped by service > level > student
    const serviceMap = new Map<string, {
      service: string;
      totalOverdue: number;
      studentCount: number;
      levels: Map<string, {
        level: string;
        totalOverdue: number;
        studentCount: number;
        students: Map<string, {
          studentId: string;
          studentName: string;
          phone: string | null;
          parentPhone: string | null;
          parentName: string | null;
          monthlyFee: number;
          totalOverdue: number;
          monthsOverdue: number;
          nextDueDate: string | null;
          subjectName: string | null;
          levelName: string | null;
          overduePayments: {
            id: string;
            month: string;
            monthLabel: string;
            year: number;
            remainingAmount: number;
            monthsOverdue: number;
          }[];
        }>;
      }>;
    }>();

    for (const student of students) {
      if (student.payments.length === 0) {
        // No payments at all — student owes from enrollment
        for (const enrollment of student.enrollments) {
          const fee = enrollment.monthlyFee || 0;
          if (fee <= 0) continue;

          const serviceName = enrollment.level?.subject?.service?.nameAr || enrollment.level?.subject?.service?.name || 'عامة';
          const levelName = enrollment.level?.nameAr || enrollment.level?.name || '';
          const subjectName = enrollment.level?.subject?.nameAr || enrollment.level?.subject?.name || '';

          const enrollmentDate = student.enrollmentDate || student.createdAt;
          const startMonth = enrollmentDate.getMonth();
          const startYear = enrollmentDate.getFullYear();

          let monthsOverdue = 0;
          let monthIter = startMonth;
          let yearIter = startYear;

          while (yearIter < currentYear || (yearIter === currentYear && monthIter < currentMonthNum)) {
            monthsOverdue++;
            monthIter++;
            if (monthIter > 12) { monthIter = 1; yearIter++; }
          }

          if (monthsOverdue <= 0) continue;

          const totalOverdue = fee * monthsOverdue;

          // Add to service map
          if (!serviceMap.has(serviceName)) {
            serviceMap.set(serviceName, { service: serviceName, totalOverdue: 0, studentCount: 0, levels: new Map() });
          }
          const svc = serviceMap.get(serviceName)!;

          if (!svc.levels.has(levelName)) {
            svc.levels.set(levelName, { level: levelName, totalOverdue: 0, studentCount: 0, students: new Map() });
          }
          const lvl = svc.levels.get(levelName)!;

          const studentKey = `${student.id}-${enrollment.id}`;
          lvl.students.set(studentKey, {
            studentId: student.id,
            studentName: student.fullName,
            phone: student.phone,
            parentPhone: student.parentPhone,
            parentName: student.parentName,
            monthlyFee: fee,
            totalOverdue,
            monthsOverdue,
            nextDueDate: new Date().toISOString().split('T')[0],
            subjectName,
            levelName,
            overduePayments: [{
              id: 'pending',
              month: MONTH_NAMES[currentMonthNum - 1],
              monthLabel: MONTH_NAMES_AR[currentMonthNum - 1],
              year: currentYear,
              remainingAmount: fee,
              monthsOverdue,
            }],
          });

          svc.totalOverdue += totalOverdue;
          svc.studentCount = new Set(lvl.students.values()).size;
          lvl.totalOverdue += totalOverdue;
          lvl.studentCount++;
        }
        continue;
      }

      // Student has payments — check for remaining amounts
      // Find the latest paid payment to determine pack coverage
      const paidPayments = student.payments.filter(p => p.status === 'paid' || p.paidAmount > 0);
      let coverageEnd: Date | null = null;

      for (const p of paidPayments) {
        const pDate = p.paymentDate ? new Date(p.paymentDate) : new Date(p.createdAt);
        const packMonths = p.packMonths || 1;
        const endDate = new Date(pDate);
        endDate.setMonth(endDate.getMonth() + packMonths);
        if (!coverageEnd || endDate > coverageEnd) {
          coverageEnd = endDate;
        }
      }

      // If the student is covered by a pack (coverageEnd > now), skip entirely
      if (coverageEnd && coverageEnd > now) {
        continue;
      }

      // For each enrollment, calculate overdue months
      for (const enrollment of student.enrollments) {
        const fee = enrollment.monthlyFee || 0;
        if (fee <= 0) continue;

        const serviceName = enrollment.level?.subject?.service?.nameAr || enrollment.level?.subject?.service?.name || 'عامة';
        const levelName = enrollment.level?.nameAr || enrollment.level?.name || '';
        const subjectName = enrollment.level?.subject?.nameAr || enrollment.level?.subject?.name || '';

        const overduePaymentsList: {
          id: string;
          month: string;
          monthLabel: string;
          year: number;
          remainingAmount: number;
          monthsOverdue: number;
        }[] = [];

        let totalOverdue = 0;

        for (const p of student.payments) {
          if (p.remainingAmount > 0) {
            const pMonthIdx = MONTH_NAMES.indexOf(p.month);
            const pMonthNum = pMonthIdx >= 0 ? pMonthIdx + 1 : 1;

            let monthsOverdue = 0;
            if (p.paymentDate) {
              const pDate = new Date(p.paymentDate);
              const diffMs = now.getTime() - pDate.getTime();
              monthsOverdue = Math.max(0, Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000)));
            } else {
              monthsOverdue = 1;
            }

            overduePaymentsList.push({
              id: p.id,
              month: p.month,
              monthLabel: MONTH_NAMES_AR[pMonthIdx >= 0 ? pMonthIdx : 0],
              year: p.year,
              remainingAmount: p.remainingAmount,
              monthsOverdue,
            });

            totalOverdue += p.remainingAmount;
          }
        }

        // Check if current month has no payment at all and student is not covered
        const currentMonthName = MONTH_NAMES[currentMonthNum - 1];
        const hasCurrentMonthPayment = student.payments.some(
          p => p.month === currentMonthName && p.year === currentYear
        );

        if (!hasCurrentMonthPayment && student.enrollments.length > 0) {
          const enrollmentDate = student.enrollmentDate || student.createdAt;
          if (enrollmentDate.getFullYear() < currentYear || 
              (enrollmentDate.getFullYear() === currentYear && enrollmentDate.getMonth() < currentMonthNum - 1)) {
            overduePaymentsList.push({
              id: 'pending',
              month: currentMonthName,
              monthLabel: MONTH_NAMES_AR[currentMonthNum - 1],
              year: currentYear,
              remainingAmount: fee,
              monthsOverdue: 1,
            });
            totalOverdue += fee;
          }
        }

        if (totalOverdue <= 0) continue;

        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, { service: serviceName, totalOverdue: 0, studentCount: 0, levels: new Map() });
        }
        const svc = serviceMap.get(serviceName)!;

        if (!svc.levels.has(levelName)) {
          svc.levels.set(levelName, { level: levelName, totalOverdue: 0, studentCount: 0, students: new Map() });
        }
        const lvl = svc.levels.get(levelName)!;

        const studentKey = `${student.id}-${enrollment.id}`;
        lvl.students.set(studentKey, {
          studentId: student.id,
          studentName: student.fullName,
          phone: student.phone,
          parentPhone: student.parentPhone,
          parentName: student.parentName,
          monthlyFee: fee,
          totalOverdue: Math.round(totalOverdue * 100) / 100,
          monthsOverdue: overduePaymentsList.length,
          nextDueDate: now.toISOString().split('T')[0],
          subjectName,
          levelName,
          overduePayments: overduePaymentsList,
        });

        svc.totalOverdue += totalOverdue;
        lvl.totalOverdue += totalOverdue;
        lvl.studentCount++;
      }
    }

    // Convert maps to arrays
    const result = Array.from(serviceMap.values()).map(svc => ({
      service: svc.service,
      totalOverdue: Math.round(svc.totalOverdue * 100) / 100,
      studentCount: new Set(
        Array.from(svc.levels.values()).flatMap(lvl => 
          Array.from(lvl.students.values()).map(s => s.studentId)
        )
      ).size,
      levels: Array.from(svc.levels.values()).map(lvl => ({
        level: lvl.level,
        totalOverdue: Math.round(lvl.totalOverdue * 100) / 100,
        studentCount: lvl.studentCount,
        students: Array.from(lvl.students.values()),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Overdue payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch overdue payments' }, { status: 500 });
  }
}
