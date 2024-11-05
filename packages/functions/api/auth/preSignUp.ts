import { PreSignUpTriggerEvent } from "aws-lambda";

export const handler = async (event: PreSignUpTriggerEvent) => {
  // Auto-confirm users
  event.response.autoConfirmUser = true;
  
  // If phone number is provided, mark it as verified
  if (event.request.userAttributes.phone_number) {
    event.response.autoVerifyPhone = true;
  }
  
  // If email is provided, mark it as verified
  if (event.request.userAttributes.email) {
    event.response.autoVerifyEmail = true;
  }
  
  return event;
};