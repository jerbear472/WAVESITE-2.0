import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing',
  });
}

// Create Supabase client with comprehensive configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'wavesight-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'wavesight-web',
    },
  },
});

// Enhanced auth helpers with better error handling
export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log('[Supabase] Attempting sign in for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error('[Supabase] Sign in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
      } else if (error.message.includes('Network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        throw error;
      }
    }

    console.log('[Supabase] Sign in successful:', data.user?.id);
    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase] Sign in exception:', err);
    return {
      data: null,
      error: err
    };
  }
};

export const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
  try {
    console.log('[Supabase] Attempting sign up for:', email);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      console.error('[Supabase] Sign up error:', error);
      throw error;
    }

    console.log('[Supabase] Sign up successful:', data.user?.id);
    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase] Sign up exception:', err);
    return {
      data: null,
      error: err
    };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[Supabase] Sign out error:', err);
    return { error: err };
  }
};

export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[Supabase] Get session error:', err);
    return { data: null, error: err };
  }
};

export const getUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (err) {
    console.error('[Supabase] Get user error:', err);
    return { user: null, error: err };
  }
};