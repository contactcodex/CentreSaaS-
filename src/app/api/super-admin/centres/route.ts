import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifySuperAdmin } from '@/lib/super-admin-auth';

const SALT_ROUNDS = 12;

// GET /api/super-admin/centres — list all centres with subscription info and user count
export async function GET() {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const centres = await db.centre.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(centres);
  } catch (error) {
    console.error('List centres error:', error);
    return NextResponse.json({ error: 'Failed to fetch centres' }, { status: 500 });
  }
}

// POST /api/super-admin/centres — create a new centre
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const { name, email, password, contactPhone, contactWhatsapp, subscriptionStatus, notes } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists as a centre
    const existingCentre = await db.centre.findUnique({ where: { email } });
    if (existingCentre) {
      return NextResponse.json(
        { error: 'A centre with this email already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists as a user
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Determine subscription status - default to trial_24h or whatever super admin chose
    const subStatus = subscriptionStatus || 'trial_24h';

    // Create centre - subscriptionStart/End stay NULL (timer starts on first login)
    const centre = await db.centre.create({
      data: {
        name,
        email,
        password: hashedPassword,
        contactPhone: contactPhone || null,
        contactWhatsapp: contactWhatsapp || null,
        notes: notes || null,
        subscriptionStatus: subStatus,
        // subscriptionStart: null - starts on first login
        // subscriptionEnd: null - calculated on first login
      },
    });

    // Create admin user for this centre
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: name,
        role: 'ADMIN',
        centreId: centre.id,
      },
    });

    return NextResponse.json(centre, { status: 201 });
  } catch (error) {
    console.error('Create centre error:', error);
    return NextResponse.json({ error: 'Failed to create centre' }, { status: 500 });
  }
}
