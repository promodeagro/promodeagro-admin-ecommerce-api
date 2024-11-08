import { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";

export const handler = async (event: VerifyAuthChallengeResponseTriggerEvent) => {
  const { privateChallengeParameters, challengeAnswer } = event.request;

  const isAnswerCorrect = privateChallengeParameters.answer === challengeAnswer;

  const otpCreationTime = privateChallengeParameters.otpCreationTime
  const otpAge = Date.now() - new Date(otpCreationTime).getTime();

  const isOtpExpired = otpAge > 2 * 60 * 1000;
  event.response.answerCorrect = isAnswerCorrect && !isOtpExpired;
  return event;
};