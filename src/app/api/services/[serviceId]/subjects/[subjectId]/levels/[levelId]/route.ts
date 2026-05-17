import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string; levelId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId, subjectId, levelId } = await params;
    const body = await request.json();
    const existing = await db.level.findFirst({
      where: { id: levelId, subjectId, subject: { serviceId, service: { centreId: auth.auth.centreId } } },
    });
    if (!existing) return NextResponse.json({ error: 'Level not found' }, { status: 404 });

    const level = await db.level.update({
      where: { id: levelId },
      data: { ...(body.name !== undefined && { name: body.name }), ...(body.nameAr !== undefined && { nameAr: body.nameAr }), ...(body.nameFr !== undefined && { nameFr: body.nameFr }) },
    });
    return NextResponse.json(level);
  } catch (error) {
    console.error('Error updating level:', error);
    return NextResponse.json({ error: 'Failed to update level' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string; levelId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId, subjectId, levelId } = await params;
    const existing = await db.level.findFirst({
      where: { id: levelId, subjectId, subject: { serviceId, service: { centreId: auth.auth.centreId } } },
    });
    if (!existing) return NextResponse.json({ error: 'Level not found' }, { status: 404 });

    await db.level.delete({ where: { id: levelId } });
    return NextResponse.json(existing);
  } catch (error) {
    console.error('Error deleting level:', error);
    return NextResponse.json({ error: 'Failed to delete level' }, { status: 500 });
  }
}
