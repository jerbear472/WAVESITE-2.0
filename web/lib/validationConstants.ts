// Validation constants to ensure consistency across the app
export const VALIDATION_CONSTANTS = {
  // Number of validations required before payment
  VALIDATIONS_REQUIRED_FOR_PAYMENT: 2,
  
  // Validation thresholds for auto-approval/rejection
  MIN_APPROVALS_FOR_AUTO_APPROVE: 3,
  MIN_REJECTIONS_FOR_AUTO_REJECT: 3,
  
  // Display text for validation requirements
  getPaymentRequirementText: () => {
    return `Paid after ${VALIDATION_CONSTANTS.VALIDATIONS_REQUIRED_FOR_PAYMENT} validations ✓`;
  },
  
  // Check if a trend has enough validations for payment
  hasEnoughValidationsForPayment: (validationCount: number) => {
    return validationCount >= VALIDATION_CONSTANTS.VALIDATIONS_REQUIRED_FOR_PAYMENT;
  }
};

export default VALIDATION_CONSTANTS;