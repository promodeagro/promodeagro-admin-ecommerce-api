import {
	AdminCreateUserCommand,
	AdminInitiateAuthCommand,
	CognitoIdentityProviderClient,
	GlobalSignOutCommand,
	RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import middy from "@middy/core";
import crypto from "crypto";
import z from "zod";
import {
	forgotPassword,
	refreshTokens,
	resetPassword,
	signin,
	signup,
} from ".";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const cognitoClient = new CognitoIdentityProviderClient({
	region: "ap-south-1",
});

const emailSchema = z.string().email({ message: "invalid email" });
const passwordSchema = z
	.string()
	.min(8, "password must be at least 8 characters");
const confirmCodeSchema = z
	.string()
	.regex(/^\d{6}$/, { message: "code be an 6-digit number" })
	.transform(Number);

const signinSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const signinHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return signin(req);
})
	.use(bodyValidator(signinSchema))
	.use(errorHandler());

const signupSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	role: z.enum(["admin", "packer"]),
	name: z.string(),
});

export const signupHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await signup(req);
})
	.use(bodyValidator(signupSchema))
	.use(errorHandler());

const forgotPassSchema = z.object({
	email: emailSchema,
});

export const forgotPasswordHandler = middy(async (event) => {
	const { email } = JSON.parse(event.body);
	await forgotPassword(email);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "Password reset instructions have been sent to your email",
		}),
	};
})
	.use(bodyValidator(forgotPassSchema))
	.use(errorHandler());

const resetPasswordSchema = z.object({
	email: emailSchema,
	confirmationCode: confirmCodeSchema,
	newPassword: passwordSchema,
});

export const resetPasswordHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await resetPassword(req);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "password reset successfully",
		}),
	};
})
	.use(bodyValidator(resetPasswordSchema))
	.use(errorHandler());

//[ADMIN_NO_SRP_AUTH, ADMIN_USER_PASSWORD_AUTH, USER_SRP_AUTH, REFRESH_TOKEN_AUTH, REFRESH_TOKEN, CUSTOM_AUTH, USER_PASSWORD_AUTH]"}
// TODO: figure out which auth flow needs to selected for it to work
export const changePassword = async (event) => {
	const { email, password, newPassword } = JSON.parse(event.body);

	const inputAuth = {
		UserPoolId: process.env.USER_POOL_ID,
		ClientId: process.env.COGNITO_CLIENT,
		AuthFlow: "USER_PASSWORD_AUTH",
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	};
	try {
		const authResponse = await cognitoClient.send(
			new AdminInitiateAuthCommand(inputAuth)
		);
		const authChallengeInput = {
			ChallengeName: "NEW_PASSWORD_REQUIRED",
			ClientId: process.env.COGNITO_CLIENT,
			ChallengeResponses: {
				USERNAME: email,
				NEW_PASSWORD: newPassword,
			},
			Session: authResponse.Session,
		};
		const newPasswordResponse = await cognitoClient.send(
			new RespondToAuthChallengeCommand(authChallengeInput)
		);
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: newPasswordResponse,
			}),
		};
	} catch (error) {
		console.error("Error creating user:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: error.message }),
		};
	}
};

const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});

export const refreshAccessTokenHandler = middy(async (event) => {
	const { refreshToken } = JSON.parse(event.body);
	return refreshTokens(refreshToken);
})
	.use(bodyValidator(refreshTokenSchema))
	.use(errorHandler());

const signoutSchema = z.object({
	accessToken: z.string(),
});

export const signout = middy(async (event) => {
	const { accessToken } = JSON.parse(event.body);
	const signOutParams = {
		AccessToken: accessToken,
	};

	const command = new GlobalSignOutCommand(signOutParams);
	await cognitoClient.send(command);

	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "Successfully signed out",
		}),
	};
})
	.use(bodyValidator(signoutSchema))
	.use(errorHandler());

import { createRider, numberExists, validateOtp } from ".";

const phoneNumberSchema = z.object({
	number: z.string().regex(/^\d{10}$/, {
		message: "Invalid phone number. Must be exactly 10 digits.",
	}),
	// userType: z.enum(["rider"]),
});

const createUser = async (number, otp, userType) => {
	if (userType === "rider") {
		return await createRider(number, otp);
	} else {
		return await createPacker(number, otp);
	}
};

export const numbersignin = middy(async (event) => {
	const { number, userType } = JSON.parse(event.body);
	console.log();
	const item = await numberExists(number, userType);
	if (item && item.length > 0) {
		const command = new AdminInitiateAuthCommand({
			AuthFlow: "CUSTOM_AUTH",
			UserPoolId: process.env.USER_POOL_ID,
			ClientId: process.env.COGNITO_CLIENT,
			AuthParameters: {
				USERNAME: `+91${number}`,
			},
		});
		const response = await cognitoClient.send(command);

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "OTP sent successfully",
				session: response.Session,
			}),
		};
	}

	console.log(2);
	const userId = crypto.randomUUID();
	const date = new Date();
	const utc = utcDate(date);
	const createCommand = new AdminCreateUserCommand({
		UserPoolId: process.env.USER_POOL_ID,
		Username: `+91${number}`,
		UserAttributes: [
			{ Name: "phone_number", Value: `+91${number}` },
			{ Name: "custom:userId", Value: userId },
			{ Name: "custom:role", Value: "rider" },
			{ Name: "custom:createdAt", Value: utc },
			{ Name: "phone_number_verified", Value: "true" },
		],
		MessageAction: "SUPPRESS",
	});
	await createRider(number);
	await cognitoClient.send(createCommand);
	console.log(4);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "rider crerated  successfully",
		}),
	};
})
	.use(bodyValidator(phoneNumberSchema))
	.use(errorHandler());

const utcDate = (date) => {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are zero-based
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
};

const validateOtpSchema = z.object({
	number: phoneNumberSchema.shape.number,
	otp: z.string().regex(/^\d{6}$/, {
		message: "Otp. Must be exactly 6 digits.",
	}),
	userType: z.enum(["rider", "packer"]),
});

export const validateOtpHandler = middy(async (event) => {
	const { otp, number, userType } = JSON.parse(event.body);
	return validateOtp(otp, number, userType);
})
	.use(bodyValidator(validateOtpSchema))
	.use(errorHandler());

// export const authorizerHandler = async (event) => {
// 	return authorizer(event);
// };

// const refreshTokenSchema = z.object({
// 	refreshToken: z.string(),
// });

// export const refreshAccessTokenHandler = middy(async (event) => {
// 	const { refreshToken } = JSON.parse(event.body);
// 	return refreshAccessToken(refreshToken);
// })
// 	.use(bodyValidator(refreshTokenSchema))
// 	.use(errorHandler());

export const numbersign = middy(async (event) => {}).use(errorHandler());
