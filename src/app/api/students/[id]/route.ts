import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const student = await db.student.findFirst({
      where: { id, centreId: auth.auth.centreId },
      include: {
        level: {
          include: {
            subject: { include: { service: true } },
          },
        },
        teacher: true,
        enrollments: {
          include: {
            level: {
              include: {
                subject: { include: { service: true } },
              },
            },
            teacher: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const enrollments: { levelId: string; teacherId?: string | null; monthlyFee?: number }[] = body.enrollments || [];

    // Verify student belongs to centre
    const existing = await db.student.findFirst({
      where: { id, centreId: auth.auth.centreId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update student basic info
    const firstEnrollment = enrollments[0] || {};
    const totalFee = enrollments.reduce((sum: number, e: { monthlyFee?: number }) => sum + (e.monthlyFee || 0), 0);
    const student = await db.student.update({
      where: { id },
      data: {
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        levelId: firstEnrollment.levelId || null,
        teacherId: firstEnrollment.teacherId || null,
        parentName: body.parentName,
        parentPhone: body.parentPhone,
        monthlyFee: totalFee,
        packMonths: body.packMonths ?? 1,
        status: body.status,
        enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : undefined,
        // Replace all enrollments
        enrollments: {
          deleteMany: {},
          create: enrollments.map((e: { levelId: string; teacherId?: string | null; monthlyFee?: number }) => ({
            levelId: e.levelId,
            teacherId: e.teacherId || null,
            monthlyFee: e.monthlyFee ?? 0,
          })),
        },
      },
      include: {
        level: {
          include: {
            subject: { include: { service: true } },
          },
        },
        teacher: true,
        enrollments: {
          include: {
            level: {
              include: {
                subject: { include: { service: true } },
              },
            },
            teacher: true,
          },
        },
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { id } = await params;
    const existing = await db.student.findFirst({
      where: { id, centreId: auth.auth.centreId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    await db.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
