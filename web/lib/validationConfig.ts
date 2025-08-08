import { supabase } from './supabase';

export interface ValidationConfig {
  required_validations: number;
  rejection_threshold: number;
}

export interface ValidationStatus {
  approve_count: number;
  reject_count: number;
  validation_status: 'pending' | 'approved' | 'rejected';
  required_approvals: number;
  required_rejections: number;
}

// Get current validation configuration
export async function getValidationConfig(): Promise<ValidationConfig> {
  const { data, error } = await supabase
    .from('validation_config')
    .select('required_validations, rejection_threshold')
    .eq('id', 1)
    .single();
    
  if (error) {
    console.warn('Failed to fetch validation config, using defaults:', error);
    return {
      required_validations: 1,
      rejection_threshold: 2
    };
  }
  
  return data;
}

// Update validation configuration (admin function)
export async function updateValidationConfig(
  required_validations: number,
  rejection_threshold: number
): Promise<void> {
  const { error } = await supabase.rpc('update_validation_config', {
    p_required_validations: required_validations,
    p_rejection_threshold: rejection_threshold
  });
  
  if (error) {
    throw new Error(`Failed to update validation config: ${error.message}`);
  }
}

// Get validation status for a trend
export async function getTrendValidationStatus(trendId: string): Promise<ValidationStatus | null> {
  const config = await getValidationConfig();
  
  // First try to get validation status from trend_submissions table
  const { data: trendData, error: trendError } = await supabase
    .from('trend_submissions')
    .select('approve_count, reject_count, validation_status')
    .eq('id', trendId)
    .single();
  
  // If columns don't exist, calculate from trend_validations table
  if (trendError && trendError.message.includes('does not exist')) {
    console.log('Validation columns missing, calculating from trend_validations table');
    
    const { data: validations, error: validationError } = await supabase
      .from('trend_validations')
      .select('vote')
      .eq('trend_submission_id', trendId);
      
    if (validationError) {
      console.error('Failed to fetch trend validations:', validationError);
      return null;
    }
    
    const approveCount = validations?.filter(v => v.vote === 'verify').length || 0;
    const rejectCount = validations?.filter(v => v.vote === 'reject').length || 0;
    
    let validationStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    if (approveCount >= config.required_validations) {
      validationStatus = 'approved';
    } else if (rejectCount >= config.rejection_threshold) {
      validationStatus = 'rejected';
    }
    
    return {
      approve_count: approveCount,
      reject_count: rejectCount,
      validation_status: validationStatus,
      required_approvals: config.required_validations,
      required_rejections: config.rejection_threshold
    };
  }
  
  if (trendError || !trendData) {
    console.error('Failed to fetch trend validation status:', trendError);
    return null;
  }
  
  return {
    approve_count: trendData.approve_count || 0,
    reject_count: trendData.reject_count || 0,
    validation_status: trendData.validation_status || 'pending',
    required_approvals: config.required_validations,
    required_rejections: config.rejection_threshold
  };
}

// Helper function to determine if earnings should be paid
export function shouldPayEarnings(status: ValidationStatus): boolean {
  return status.validation_status === 'approved';
}

// Helper function to get validation progress text
export function getValidationProgressText(status: ValidationStatus): string {
  const { approve_count, reject_count, required_approvals, required_rejections, validation_status } = status;
  
  if (validation_status === 'approved') {
    return '✅ Approved - Earnings paid';
  }
  
  if (validation_status === 'rejected') {
    return '❌ Rejected - No payout';
  }
  
  // Pending status
  const approvalsNeeded = Math.max(0, required_approvals - approve_count);
  const rejectionsNeeded = Math.max(0, required_rejections - reject_count);
  
  if (approvalsNeeded === 1) {
    return `⏳ Needs 1 more approval (${approve_count}/${required_approvals})`;
  }
  
  return `⏳ Needs ${approvalsNeeded} approvals or ${rejectionsNeeded} rejections (${approve_count}✓ ${reject_count}✗)`;
}