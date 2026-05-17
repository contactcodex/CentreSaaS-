import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { subjectId } = await params;
    const subject = await db.subject.findFirst({
      where: { id: subjectId, service: { centreId: auth.auth.centreId } },
      include: { levels: { orderBy: { order: 'asc' } } },
    });
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; subjectId: string }> }
) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId, subjectId } = await params;
    const body = await request.json();
    if (!body.name || !body.nameAr || !body.nameFr) return NextResponse.json({ error: 'name, nameAr, and nameFr are required' }, { status: 400 });

    const subject = await db.subject.findFirst({ where: { id: subjectId, serviceId, service: { centreId: auth.auth.centreId } } });
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    const maxOrder = await db.level.count({ where: { subjectId } });
    const level = await db.level.create({
      data: { name: body.name, nameAr: body.nameAr, nameFr: body.nameFr, subjectId, order: maxOrder },
    });
    return NextResponse.json(level, { status: 201 });
  } catch (error) {
    console.error('Error creating level:', error);
    return NextResponse.json({ error: 'Failed to create level' }, { status: 500 });
  }
}
