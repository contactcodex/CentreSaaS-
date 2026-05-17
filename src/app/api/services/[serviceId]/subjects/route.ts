import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId } = await params;
    const service = await db.service.findFirst({
      where: { id: serviceId, centreId: auth.auth.centreId },
      include: { subjects: { include: { levels: true }, orderBy: { order: 'asc' } } },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;

    const { serviceId } = await params;
    const body = await request.json();
    if (!body.name || !body.nameAr || !body.nameFr) {
      return NextResponse.json({ error: 'name, nameAr, and nameFr are required' }, { status: 400 });
    }

    const service = await db.service.findFirst({ where: { id: serviceId, centreId: auth.auth.centreId } });
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const maxOrder = await db.subject.count({ where: { serviceId } });
    const subject = await db.subject.create({
      data: { name: body.name, nameAr: body.nameAr, nameFr: body.nameFr, serviceId, order: maxOrder },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
