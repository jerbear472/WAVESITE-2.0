'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function TestPersonaPage() {
  const { user } = useAuth();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [personaData, setPersonaData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    if (user) {
      testPersonaSystem();
    }
  }, [user]);

  const testPersonaSystem = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }

    addLog(`Testing persona system for user: ${user.id}`);

    // Test 1: Check if we can query the table
    try {
      addLog('Testing table access...');
      const { count, error } = await supabase
        .from('user_personas')
        .select('*', { count: 'exact', head: true });

      if (error) {
        addLog(`Table access error: ${error.message}`);
        setTableError(error.message);
        setTableExists(false);
      } else {
        addLog(`Table exists! Total records: ${count}`);
        setTableExists(true);
      }
    } catch (e) {
      addLog(`Exception checking table: ${e}`);
      setTableExists(false);
    }

    // Test 2: Try to fetch user's persona
    try {
      addLog('Fetching user persona...');
      const { data, error } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        addLog(`Error fetching persona: ${error.message}`);
      } else if (data) {
        addLog('Found persona in database!');
        setPersonaData(data);
      } else {
        addLog('No persona found for user');
      }
    } catch (e) {
      addLog(`Exception fetching persona: ${e}`);
    }

    // Test 3: Check localStorage
    const localData = localStorage.getItem(`persona_${user.id}`);
    if (localData) {
      addLog('Found persona in localStorage');
      try {
        const parsed = JSON.parse(localData);
        addLog(`LocalStorage persona has ${Object.keys(parsed).length} keys`);
      } catch (e) {
        addLog('Error parsing localStorage data');
      }
    } else {
      addLog('No persona in localStorage');
    }
  };

  const createTestPersona = async () => {
    if (!user) return;

    addLog('Creating test persona...');
    
    const testData = {
      user_id: user.id,
      location_country: 'Test Country',
      location_city: 'Test City',
      location_urban_type: 'urban',
      age_range: '25-34',
      gender: 'prefer-not-to-say',
      education_level: 'Bachelor\'s',
      employment_status: 'full-time',
      industry: 'Technology',
      interests: ['Technology', 'Gaming'],
      is_complete: true,
      completion_date: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('user_personas')
        .upsert(testData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        addLog(`Error creating persona: ${error.message}`);
      } else {
        addLog('Test persona created successfully!');
        setPersonaData(data);
      }
    } catch (e) {
      addLog(`Exception creating persona: ${e}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Persona System Test</h1>
        
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <div>User ID: {user?.id || 'Not logged in'}</div>
            <div>
              Table Status: {' '}
              {tableExists === null ? 'Checking...' : 
               tableExists ? '✅ Table exists' : '❌ Table missing or inaccessible'}
            </div>
            {tableError && (
              <div className="text-red-400">Error: {tableError}</div>
            )}
            <div>
              Persona Status: {' '}
              {personaData ? '✅ Has persona' : '❌ No persona'}
            </div>
          </div>
        </div>

        {personaData && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Current Persona Data</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(personaData, null, 2)}
            </pre>
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={createTestPersona}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg mr-4"
          >
            Create Test Persona
          </button>
          <button
            onClick={testPersonaSystem}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg"
          >
            Refresh Tests
          </button>
        </div>

        <div className="p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}