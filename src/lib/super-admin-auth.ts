import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Verifies that the current request has a valid session for a SUPER_ADMIN user.
 * Reads the `auth_token` cookie, validates the session, and checks the user role.
 * Returns the user object if valid, or a 401 NextResponse if invalid.
 */
export async function verifySuperAdmin(): Promise<
  | { success: true; user: { id: string; email: string; fullName: string; role: string } }
  | { success: false; response: NextResponse }
> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      };
    }

    // Find session with valid expiry
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 }),
      };
    }

    // Check user role is SUPER_ADMIN
    if (session.user.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
      };
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role,
      },
    };
  } catch (error) {
    console.error('Super admin auth error:', error);
    return {
      success: false,
      response: NextResponse.json({ error: 'Authentication error' }, { status: 500 }),
    };
  }
}
