import { DefineAuthChallengeTriggerEvent } from "aws-lambda";

export const handler = async (event: DefineAuthChallengeTriggerEvent) => {
	const { request } = event;

	// If user doesn't exist, return error
	if (request.userNotFound) {
		return {
			isValid: false,
			statusCode: 400,
			error: "User not found",
		};
	}

	// If this is password auth, skip custom challenge
	if (request.session?.length > 0 &&
		request.session[0].challengeName === "SRP_A") {
		return {
			issueTokens: true,
			failAuthentication: false,
		};
	}

	// For custom OTP flow
	if (!request.session || request.session.length === 0) {
		// Start custom auth challenge
		return {
			challengeName: "CUSTOM_CHALLENGE",
			issueTokens: false,
			failAuthentication: false,
		};
	}

	// Handle subsequent challenges
	if (request.session.length === 1 &&
		request.session[0].challengeName === "CUSTOM_CHALLENGE" &&
		request.session[0].challengeResult === true) {
		// User successfully completed the challenge
		return {
			issueTokens: true,
			failAuthentication: false,
		};
	}

	// Wrong OTP, try again
	if (request.session.length === 1 &&
		request.session[0].challengeName === "CUSTOM_CHALLENGE" &&
		request.session[0].challengeResult === false) {
		return {
			issueTokens: false,
			failAuthentication: false,
			challengeName: "CUSTOM_CHALLENGE",
		};
	}

	// Default to failing authentication
	return {
		issueTokens: false,
		failAuthentication: true,
	};
};