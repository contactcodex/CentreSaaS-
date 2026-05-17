import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const classroom = await db.classroom.findFirst({
      where: { id, centreId: auth.auth.centreId },
      include: {
        schedules: {
          include: { subject: true, teacher: true, level: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    return NextResponse.json(classroom);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.classroom.findFirst({ where: { id, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    const body = await request.json();
    const classroom = await db.classroom.update({ where: { id }, data: { name: body.name, nameAr: body.nameAr, capacity: body.capacity } });
    return NextResponse.json(classroom);
  } catch {
    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { id } = await params;
    const existing = await db.classroom.findFirst({ where: { id, centreId: auth.auth.centreId } });
    if (!existing) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    await db.classroom.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
  }
}
