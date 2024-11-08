import { CreateAuthChallengeTriggerEvent } from "aws-lambda";
import { generateOtp, sendOtp } from "./sendOtp";

export const handler = async (event: CreateAuthChallengeTriggerEvent) => {
  const { request, response } = event;
  let otp;
  let date
  if (request.challengeName === "CUSTOM_CHALLENGE") {

    if (!request.session || request.session.length === 0) {

      otp = generateOtp()
      date = Date.now()

      response.privateChallengeParameters = {
        answer: otp.toString(),
        otpCreationTime: date
      };
      response.challengeMetadata = JSON.stringify({
        expire: date,
        otp: otp
      })
      try {
        await sendOtp(otp, request.userAttributes.phone_number.substring(3))
        response.publicChallengeParameters = {
          message: "Please check your phone for the verification code",
        };
      } catch (error) {
        console.error("Error sending OTP:", error);
        throw new Error("Failed to send OTP");
      }
    } else {
      const prev = request.session.slice(-1)[0]
      let data = JSON.parse(prev.challengeMetadata as any)
      event.response = {
        ...response,
        privateChallengeParameters: {
          answer: data.otp,
          otpCreationTime: data.expiry
        },
        challengeMetadata: JSON.stringify({
          expire: date,
          otp: otp
        })
      }
    }
  }
  return event;
};