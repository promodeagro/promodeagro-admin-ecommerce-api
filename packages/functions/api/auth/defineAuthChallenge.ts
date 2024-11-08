import { DefineAuthChallengeTriggerEvent } from "aws-lambda";

export const handler = async (event: DefineAuthChallengeTriggerEvent) => {
  const { request, response } = event;
  // If user doesn't exist, fail authentication
  if (request.userNotFound) {
    response.issueTokens = false;
    response.failAuthentication = true;
    return event;
  }

  // If this is password auth (SRP), skip custom challenge
  if (request.session?.length > 0 &&
    request.session[0].challengeName === "SRP_A") {
    response.issueTokens = true;
    response.failAuthentication = false;
    return event;
  }

  // Initial OTP Challenge
  if (!request.session || request.session.length === 0) {
    response.issueTokens = false;
    response.failAuthentication = false;
    response.challengeName = "CUSTOM_CHALLENGE";  // Set OTP challenge
    return event;
  }

  // If OTP is correct, issue tokens and authenticate the user
  if (request.session.length > 0 && request.session.slice(-1)[0].challengeName === "CUSTOM_CHALLENGE" && request.session.slice(-1)[0].challengeResult === true) {
    response.issueTokens = true;
    response.failAuthentication = false;
    return event;
  }

  // If OTP is wrong, prompt user to try again without changing the session
  if (request.session.length > 0 && request.session.slice(-1)[0].challengeName === "CUSTOM_CHALLENGE" && request.session.slice(-1)[0].challengeResult === false) {
    response.issueTokens = false;
    response.failAuthentication = false;
    response.challengeName = "CUSTOM_CHALLENGE"; // Retry the OTP challenge
    return event;
  }

  // Default: Fail authentication
  response.issueTokens = false;
  response.failAuthentication = true;
  return event
};
