import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const cid = auth.auth.centreId;

    const services = await db.service.findMany({
      where: { centreId: cid },
      include: {
        subjects: {
          include: { levels: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    const deduped = services.map((s) => {
      const seen = new Set<string>();
      return {
        ...s,
        subjects: s.subjects.map((sub) => ({
          ...sub,
          levels: sub.levels.filter((l) => {
            if (seen.has(l.name)) return false;
            seen.add(l.name);
            return true;
          }),
        })),
      };
    });

    return NextResponse.json(deduped);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const body = await request.json();

    if (!body.name || !body.nameAr || !body.nameFr) {
      return NextResponse.json({ error: 'name, nameAr, and nameFr are required' }, { status: 400 });
    }

    const maxOrder = body.order ?? (await db.service.count({ where: { centreId: auth.auth.centreId } }));
    const service = await db.service.create({
      data: {
        name: body.name,
        nameAr: body.nameAr,
        nameFr: body.nameFr,
        icon: body.icon || null,
        order: maxOrder,
        centreId: auth.auth.centreId,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
