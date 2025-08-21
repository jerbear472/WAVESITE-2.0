import { supabase } from './supabase';

export async function simpleLogin(email: string, password: string) {
  console.log('[SIMPLE LOGIN] Starting login for:', email);
  
  try {
    // Clear any existing session
    await supabase.auth.signOut();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });
    
    if (authError) {
      console.error('[SIMPLE LOGIN] Auth error:', authError);
      
      if (authError.message.includes('Email not confirmed')) {
        // Try to get the user ID to check if profile exists
        throw new Error('Please confirm your email. Check your inbox for the confirmation link.');
      }
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw authError;
    }
    
    if (!authData.session || !authData.user) {
      throw new Error('Login failed - no session created');
    }
    
    console.log('[SIMPLE LOGIN] Auth successful, checking profile...');
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile) {
      console.log('[SIMPLE LOGIN] Profile not found, creating...');
      
      // Create profile if it doesn't exist
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          username: authData.user.email?.split('@')[0] || 'user',
          role: 'participant',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createError) {
        console.warn('[SIMPLE LOGIN] Profile creation warning:', createError);
      }
      
      // Also create user_profiles entry
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: authData.user.email?.split('@')[0] || 'user',
          email: authData.user.email,
          role: 'participant',
          total_earned: 0,
          pending_xp: 0,
          trends_spotted: 0,
          performance_tier: 'lxp',
          current_streak: 0,
          session_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (userProfileError) {
        console.warn('[SIMPLE LOGIN] User profile creation warning:', userProfileError);
      }
    }
    
    console.log('[SIMPLE LOGIN] Login complete!');
    return {
      success: true,
      user: authData.user,
      session: authData.session
    };
    
  } catch (error: any) {
    console.error('[SIMPLE LOGIN] Error:', error.message);
    throw error;
  }
}