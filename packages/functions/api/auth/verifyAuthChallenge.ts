import { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";

export const handler = async (event: VerifyAuthChallengeResponseTriggerEvent) => {
  const { request } = event;
  console.log(request);
  if (request.privateChallengeParameters?.answer === 
      request.challengeAnswer) {
    event.response.answerCorrect = true;
  } else {
    event.response.answerCorrect = false;
  }
  
  return event;
};