import { supabase } from './supabase';

export const clearAllAuthState = async () => {
  // Clear all localStorage items related to Supabase
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('sb-') || 
    key.includes('supabase') || 
    key === 'access_token'
  );
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear session storage as well
  const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
    key.startsWith('sb-') || 
    key.includes('supabase')
  );
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  // Force sign out from Supabase
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error during force signout:', error);
  }
};

export const debugAuthState = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log('Debug Auth State:');
  console.log('Session:', session);
  console.log('User:', user);
  console.log('LocalStorage keys:', Object.keys(localStorage).filter(k => k.includes('supabase')));
  console.log('SessionStorage keys:', Object.keys(sessionStorage).filter(k => k.includes('supabase')));
  
  return { session, user };
};