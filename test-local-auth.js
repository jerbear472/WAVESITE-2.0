#!/usr/bin/env node

/**
 * Test local authentication with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the same env vars as the web app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://achuavagkhjenaypawij.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

console.log('🔐 Testing Local Authentication\n');
console.log('================================\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Using Anon Key:', supabaseAnonKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    // Test credentials - you'll need to replace these with actual test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    console.log('1️⃣ Testing connection to Supabase...');
    
    // First, test if we can reach Supabase
    try {
        const { data: healthCheck, error: healthError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
            
        if (healthError && !healthError.message.includes('permission')) {
            console.error('❌ Cannot connect to Supabase:', healthError.message);
            return;
        } else {
            console.log('✅ Connected to Supabase successfully\n');
        }
    } catch (error) {
        console.error('❌ Connection error:', error);
        return;
    }
    
    console.log('2️⃣ Testing authentication...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}\n`);
    
    try {
        // Try to sign in
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });
        
        if (authError) {
            console.error('❌ Authentication failed:', authError.message);
            console.log('\nPossible issues:');
            console.log('  1. Invalid credentials (user doesn\'t exist or wrong password)');
            console.log('  2. Email not confirmed');
            console.log('  3. Account disabled');
            console.log('  4. Rate limiting');
            
            // Try to provide more specific guidance
            if (authError.message.includes('Invalid login credentials')) {
                console.log('\n💡 Solution: Create a test user or use existing credentials');
            } else if (authError.message.includes('Email not confirmed')) {
                console.log('\n💡 Solution: Check email for confirmation link');
            }
            
            return;
        }
        
        console.log('✅ Authentication successful!');
        console.log('   User ID:', authData.user?.id);
        console.log('   Email:', authData.user?.email);
        console.log('   Session:', authData.session ? 'Active' : 'None');
        
        // Check if user has a profile
        if (authData.user) {
            console.log('\n3️⃣ Checking user profile...');
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
                
            if (profileError) {
                console.error('❌ Profile fetch error:', profileError.message);
            } else if (profile) {
                console.log('✅ Profile found:');
                console.log('   Username:', profile.username || 'Not set');
                console.log('   Created:', new Date(profile.created_at).toLocaleDateString());
                console.log('   Admin:', profile.is_admin ? 'Yes' : 'No');
            }
        }
        
        // Sign out
        console.log('\n4️⃣ Signing out...');
        await supabase.auth.signOut();
        console.log('✅ Signed out successfully');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

console.log('📝 To test with your own credentials, you can:');
console.log('   1. Edit this file and change testEmail and testPassword');
console.log('   2. Or create a new user through the registration page');
console.log('   3. Or use the Supabase dashboard to create a test user\n');

console.log('Press Ctrl+C to exit after testing\n');

// Run the test
testAuth();