import { CreateAuthChallengeTriggerEvent } from "aws-lambda";

// Import your preferred OTP service here
import { generateOtp, sendOtp } from "./sendOtp";

export const handler = async (event: CreateAuthChallengeTriggerEvent) => {
  const { request, response } = event;
  console.log(JSON.stringify(request, null, 2));
  if (request.challengeName === "CUSTOM_CHALLENGE") {
    // Generate a random 6-digit OTP
    const otp = generateOtp()

    // Store the OTP securely in the private challenge parameters
    response.privateChallengeParameters = {
      answer: otp.toString()
    };

    // Send OTP via your preferred service
    try {
      await sendOtp(otp, "9885876186")
      response.publicChallengeParameters = {
        message: "Please check your phone for the verification code",
      };
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw new Error("Failed to send OTP");
    }
  }

  return event;
};