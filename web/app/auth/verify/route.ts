import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle errors from Supabase
  if (error) {
    console.error('Auth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  if (token_hash && type) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (verifyError) {
        console.error('Verify OTP error:', verifyError);
        
        // Check if it's because email is already confirmed
        if (verifyError.message.includes('Token has expired or is invalid')) {
          // Redirect to login with a message
          return NextResponse.redirect(
            new URL('/login?message=Email+may+already+be+confirmed.+Please+try+logging+in.', requestUrl.origin)
          );
        }
        
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin)
        );
      }

      // Email confirmed successfully
      return NextResponse.redirect(
        new URL('/login?confirmed=true&message=Email+confirmed+successfully!', requestUrl.origin)
      );
    } catch (err: any) {
      console.error('Verification exception:', err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(err.message || 'Verification failed')}`, requestUrl.origin)
      );
    }
  }

  // If we get here, parameters are missing
  return NextResponse.redirect(
    new URL('/login?error=Invalid+confirmation+link', requestUrl.origin)
  );
}