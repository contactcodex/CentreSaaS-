import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const classroom = await db.classroom.findFirst({ where: { id, centreId: auth.auth.centreId } });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    return NextResponse.json({ classroomId: id, classroomName: classroom.nameAr, students: [], totalOverdue: 0, studentCount: 0 });
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch overdue' }, { status: 500 }); }
}
