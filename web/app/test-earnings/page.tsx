'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function TestEarningsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.id) {
      testEverything();
    }
  }, [user]);
  
  const testEverything = async () => {
    if (!user?.id) return;
    
    console.log('🧪 Testing earnings for user:', user.id);
    const results: any = {};
    
    // Test 1: Check user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    results.userProfile = { data: profileData, error: profileError };
    console.log('1️⃣ user_profiles:', profileData, profileError);
    
    // Test 2: Check earnings_ledger
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    results.earningsLedger = { data: ledgerData, error: ledgerError };
    console.log('2️⃣ earnings_ledger:', ledgerData, ledgerError);
    
    // Test 3: Try to call add_pending_earnings
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('add_pending_earnings', {
        p_user_id: user.id,
        p_amount: 0.01,
        p_description: 'Test from test page'
      });
    
    results.rpcCall = { data: rpcData, error: rpcError };
    console.log('3️⃣ RPC add_pending_earnings:', rpcData, rpcError);
    
    // Test 4: Direct update attempt
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        pending_earnings: (profileData?.pending_earnings || 0) + 0.01 
      })
      .eq('id', user.id)
      .select();
    
    results.directUpdate = { data: updateData, error: updateError };
    console.log('4️⃣ Direct update:', updateData, updateError);
    
    // Test 5: Check profiles view
    const { data: profilesViewData, error: profilesViewError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    results.profilesView = { data: profilesViewData, error: profilesViewError };
    console.log('5️⃣ profiles view:', profilesViewData, profilesViewError);
    
    setData(results);
    setLoading(false);
  };
  
  const addTestEarnings = async () => {
    const amount = 0.25;
    console.log('Adding test earnings:', amount);
    
    // Try multiple methods
    const methods = [];
    
    // Method 1: RPC
    const { error: rpcError } = await supabase
      .rpc('add_pending_earnings', {
        p_user_id: user?.id,
        p_amount: amount,
        p_description: 'Manual test earnings'
      });
    methods.push({ method: 'RPC', error: rpcError });
    
    // Method 2: Direct update
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        pending_earnings: (data.userProfile?.data?.pending_earnings || 0) + amount 
      })
      .eq('id', user?.id);
    methods.push({ method: 'Direct Update', error: updateError });
    
    console.log('Test results:', methods);
    alert('Check console for results, then refresh page');
    
    // Reload data
    setTimeout(() => testEverything(), 500);
  };
  
  if (loading) return <div className="p-8">Loading...</div>;
  
  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Earnings Test Page</h1>
      <p className="mb-4">User ID: {user?.id}</p>
      
      <button 
        onClick={addTestEarnings}
        className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Add $0.25 Test Earnings
      </button>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. User Profile Table</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(data.userProfile, null, 2)}
          </pre>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">2. Earnings Ledger</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(data.earningsLedger, null, 2)}
          </pre>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">3. RPC Function Test</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(data.rpcCall, null, 2)}
          </pre>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Direct Update Test</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(data.directUpdate, null, 2)}
          </pre>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Profiles View</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(data.profilesView, null, 2)}
          </pre>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">6. Current Auth User</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify({
              pending_earnings: user?.pending_earnings,
              total_earnings: user?.total_earnings,
              trends_spotted: user?.trends_spotted
            }, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}