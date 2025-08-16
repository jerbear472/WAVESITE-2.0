import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  
  try {
    // Check user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, pending_earnings, approved_earnings, total_earned, performance_tier, current_streak, session_streak')
      .eq('user_id', userId)
      .single();
    
    // Check earnings_ledger entries
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Calculate totals
    const pendingTotal = ledgerEntries?.filter(e => e.status === 'pending' || e.status === 'awaiting_validation')
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    
    const approvedTotal = ledgerEntries?.filter(e => e.status === 'approved' || e.status === 'paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    
    return NextResponse.json({
      userProfile: userProfile || { error: profileError?.message || 'No profile found' },
      recentLedgerEntries: ledgerEntries || [],
      ledgerError: ledgerError?.message,
      calculations: {
        pendingFromLedger: pendingTotal,
        approvedFromLedger: approvedTotal,
        pendingInProfile: userProfile?.pending_earnings || 0,
        approvedInProfile: userProfile?.approved_earnings || 0,
        totalInProfile: userProfile?.total_earned || 0
      },
      summary: {
        profileExists: !!userProfile,
        ledgerEntriesCount: ledgerEntries?.length || 0,
        pendingEntriesCount: ledgerEntries?.filter(e => e.status === 'pending').length || 0,
        mismatch: pendingTotal !== (userProfile?.pending_earnings || 0)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}