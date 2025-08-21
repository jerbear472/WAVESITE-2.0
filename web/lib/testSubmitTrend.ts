import { supabase } from './supabase';

// Minimal test submission function
export async function testSubmitTrend(userId: string) {
  console.log('🧪 Starting minimal test submission...');
  
  try {
    // Step 1: Test basic connection
    console.log('Step 1: Testing connection...');
    const { data: test1, error: error1 } = await supabase
      .from('trend_submissions')
      .select('count')
      .limit(1);
    
    if (error1) {
      console.error('Connection test failed:', error1);
      return { success: false, error: 'Connection failed', details: error1 };
    }
    console.log('✅ Connection successful');
    
    // Step 2: Try minimal insert with only required fields
    console.log('Step 2: Attempting minimal insert...');
    const minimalData = {
      spotter_id: userId,
      category: 'tech',
      description: 'Test trend submission',
      status: 'submitted'
    };
    
    console.log('Minimal data:', minimalData);
    
    const { data: submission, error: submitError } = await supabase
      .from('trend_submissions')
      .insert(minimalData)
      .select()
      .single();
    
    if (submitError) {
      console.error('Minimal insert failed:', submitError);
      console.error('Error details:', {
        message: submitError.message,
        details: submitError.details,
        hint: submitError.hint,
        code: submitError.code
      });
      return { success: false, error: 'Insert failed', details: submitError };
    }
    
    console.log('✅ Minimal submission successful:', submission);
    
    // Step 3: Try adding more fields incrementally
    console.log('Step 3: Testing with additional fields...');
    const fullData = {
      spotter_id: userId,
      category: 'tech',
      description: 'Full test trend submission',
      status: 'submitted',
      title: 'Test Title',
      platform: 'test',
      payment_amount: 10,
      quality_score: 75,
      wave_score: 50,
      views_count: 0,
      likes_count: 0,
      comments_count: 0
    };
    
    console.log('Full data:', fullData);
    
    const { data: fullSubmission, error: fullError } = await supabase
      .from('trend_submissions')
      .insert(fullData)
      .select()
      .single();
    
    if (fullError) {
      console.error('Full insert failed:', fullError);
      return { 
        success: false, 
        error: 'Full insert failed but minimal worked', 
        minimalSubmission: submission,
        fullError: fullError 
      };
    }
    
    console.log('✅ Full submission successful:', fullSubmission);
    
    // Clean up test data
    await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', submission.id);
    
    await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', fullSubmission.id);
    
    return { 
      success: true, 
      message: 'All tests passed!',
      minimalSubmission: submission,
      fullSubmission: fullSubmission
    };
    
  } catch (error: any) {
    console.error('Test failed with exception:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      exception: error
    };
  }
}