import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifySuperAdmin } from '@/lib/super-admin-auth';

const SALT_ROUNDS = 12;

// POST /api/super-admin/centres/[id]/reset-password — reset a centre admin's password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin();
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check centre exists
    const centre = await db.centre.findUnique({ where: { id } });
    if (!centre) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 });
    }

    // Find the admin user for this centre
    const adminUser = await db.user.findFirst({
      where: {
        centreId: id,
        role: 'ADMIN',
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'No admin user found for this centre' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Update password for both the User and Centre records
    await db.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword },
    });

    await db.centre.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Invalidate all existing sessions for this user
    await db.session.deleteMany({
      where: { userId: adminUser.id },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
