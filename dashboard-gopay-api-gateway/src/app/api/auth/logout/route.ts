import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Berhasil keluar dan brankas telah dikunci.',
  });
  clearSessionCookie(res);
  return res;
}
