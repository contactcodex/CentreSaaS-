import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { st } from '@/lib/server-t';

const SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: st('allFieldsRequired') }, { status: 400 });
    }

    // Check if super admin already exists
    const existingSuperAdmin = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (existingSuperAdmin) {
      return NextResponse.json({ error: st('adminAlreadyExists') }, { status: 400 });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create super admin user
    const user = await db.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        fullName,
        role: 'SUPER_ADMIN',
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      message: st('adminCreated'),
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: st('adminCreateError') }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check if super admin exists
    const superAdmin = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    return NextResponse.json({ hasSuperAdmin: !!superAdmin });
  } catch (error) {
    return NextResponse.json({ error: st('error') }, { status: 500 });
  }
}
