import { supabase } from './supabase';

// Retry logic for auth operations
export async function retryAuth<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`Auth attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Ensure session is valid
export async function ensureValidSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      return null;
    }
    
    if (!session) {
      console.log('No active session');
      return null;
    }
    
    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000);
    const exp = session.expires_at || 0;
    
    if (exp - now < 60) {
      console.log('Token expiring soon, refreshing...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return null;
      }
      
      return newSession;
    }
    
    return session;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Safe login with retries
export async function safeLogin(email: string, password: string) {
  console.log('[SAFE LOGIN] Starting login for:', email);
  
  return retryAuth(async () => {
    console.log('[SAFE LOGIN] Clearing existing session...');
    // Clear any existing session first
    await supabase.auth.signOut();
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[SAFE LOGIN] Calling signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('[SAFE LOGIN] Sign in result:', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id
    });
    
    if (error) {
      console.error('[SAFE LOGIN] Auth error:', error);
      // Check for specific errors
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email before logging in. Check your inbox for the confirmation link.');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      throw error;
    }
    
    if (!data?.session) {
      console.error('[SAFE LOGIN] No session in data:', data);
      throw new Error('Login succeeded but no session was created. Please try again.');
    }
    
    console.log('[SAFE LOGIN] Login successful, returning data');
    return data;
  });
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await ensureValidSession();
  return !!session;
}

// Get current user with retry
export async function getCurrentUser() {
  return retryAuth(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      throw error;
    }
    
    return user;
  });
}