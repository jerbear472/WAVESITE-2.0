import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/login';

  if (token_hash && type) {
    const supabase = createRouteHandlerClient({ cookies });
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (!error) {
        // Redirect to login with success message
        return NextResponse.redirect(new URL(`${next}?confirmed=true`, requestUrl.origin));
      }
    } catch (err) {
      console.error('Email verification error:', err);
    }
  }

  // Redirect to login with error
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin));
}