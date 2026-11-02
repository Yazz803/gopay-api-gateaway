import { NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Layanan API GoPay Berfungsi Normal',
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
