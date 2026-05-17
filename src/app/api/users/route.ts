import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCentreAuth } from '@/lib/centre-auth';
import bcrypt from 'bcryptjs';
import { st } from '@/lib/server-t';

const SALT_ROUNDS = 12;

export async function GET(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const users = await db.user.findMany({ where: { centreId: auth.auth.centreId }, select: { id: true, email: true, fullName: true, role: true, status: true, accessPages: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: st('fetchUsersError') }, { status: 500 });
  }
}

// POST /api/users — create new user
export async function POST(request: NextRequest) {
  try {
    const auth = await getCentreAuth(request);
    if (!auth.success) return auth.response;
    const { email, password, fullName, role, status, accessPages } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: st('usersFieldsRequired') }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: st('emailAlreadyUsed') }, { status: 409 });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: role || 'SECRETARY',
        status: status || 'active',
        accessPages: accessPages || '',
        centreId: auth.auth.centreId,
      },
      select: {
        id: true, email: true, fullName: true, role: true, status: true, accessPages: true, createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: st('createUserError') }, { status: 500 });
  }
}
