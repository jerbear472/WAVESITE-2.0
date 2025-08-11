'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';

function TestRegisterComponent() {
  const [result, setResult] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  
  // Initialize supabase on client side only
  useEffect(() => {
    setSupabase(createClientComponentClient());
  }, []);
  
  const testRegistration = async () => {
    if (!supabase) {
      setResult({ error: 'Supabase not initialized yet' });
      return;
    }
    
    setLoading(true);
    const timestamp = Date.now();
    const testData = {
      email: `test${timestamp}@wavesight.com`,
      password: 'TestPassword123!',
      username: `user${timestamp}`,
      birthday: '2000-01-01'
    };
    
    console.log('Testing with:', testData);
    setResult({ status: 'Starting test...', testData });
    
    try {
      // Step 1: Create auth user
      console.log('Step 1: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testData.email,
        password: testData.password,
        options: {
          data: {
            username: testData.username,
            birthday: testData.birthday
          }
        }
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        setResult(prev => ({ 
          ...prev, 
          authError: authError.message,
          authErrorDetails: authError
        }));
        return;
      }
      
      console.log('Auth success:', authData);
      setResult(prev => ({ 
        ...prev, 
        authSuccess: true,
        userId: authData.user?.id,
        session: !!authData.session,
        emailConfirmed: authData.user?.email_confirmed_at
      }));
      
      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Check if profile was created
      console.log('Step 2: Checking user_profiles...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single();
        
      if (profileError) {
        console.error('Profile error:', profileError);
        setResult(prev => ({ 
          ...prev, 
          profileError: profileError.message,
          profileErrorDetails: profileError
        }));
      } else {
        console.log('Profile found:', profile);
        setResult(prev => ({ 
          ...prev, 
          profileFound: true,
          profile: profile
        }));
      }
      
      // Step 3: Check profiles view
      console.log('Step 3: Checking profiles view...');
      const { data: profileView, error: viewError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single();
        
      if (viewError) {
        console.error('View error:', viewError);
        setResult(prev => ({ 
          ...prev, 
          viewError: viewError.message,
          viewErrorDetails: viewError
        }));
      } else {
        console.log('Profile view found:', profileView);
        setResult(prev => ({ 
          ...prev, 
          viewFound: true,
          profileView: profileView
        }));
      }
      
      // Step 4: Try manual insert if trigger failed
      if (!profile && authData.user) {
        console.log('Step 4: Manual profile creation...');
        const { data: manualProfile, error: manualError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: testData.email,
            username: testData.username,
            birthday: testData.birthday
          })
          .select()
          .single();
          
        if (manualError) {
          console.error('Manual insert error:', manualError);
          setResult(prev => ({ 
            ...prev, 
            manualError: manualError.message,
            manualErrorDetails: manualError
          }));
        } else {
          console.log('Manual insert success:', manualProfile);
          setResult(prev => ({ 
            ...prev, 
            manualSuccess: true,
            manualProfile: manualProfile
          }));
        }
      }
      
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setResult(prev => ({ 
        ...prev, 
        unexpectedError: error.message,
        errorStack: error.stack
      }));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Registration Test</h1>
      
      <button
        onClick={testRegistration}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg mb-8 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Registration'}
      </button>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Results:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
      
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">What This Tests:</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Creates auth user with Supabase Auth</li>
          <li>Checks if trigger created user_profiles entry</li>
          <li>Checks if profiles view works</li>
          <li>Attempts manual insert if trigger failed</li>
          <li>Shows all errors in detail</li>
        </ul>
      </div>
    </div>
  );
}

// Export as dynamic component to avoid SSR issues
export default dynamic(() => Promise.resolve(TestRegisterComponent), {
  ssr: false
});