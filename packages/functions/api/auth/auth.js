import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	ForgotPasswordCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	ConfirmForgotPasswordCommand,
	AdminInitiateAuthCommand,
	RespondToAuthChallengeCommand,
	GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import z from "zod";

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
export const signin = middy(async (event) => {
	const { email, password } = JSON.parse(event.body);
	const authParams = {
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: process.env.COGNITO_CLIENT,
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	};

	const authCommand = new InitiateAuthCommand(authParams);
	const authResponse = await cognitoClient.send(authCommand);
	const accessToken = authResponse.AuthenticationResult?.AccessToken;
	const idToken = authResponse.AuthenticationResult?.IdToken;
	const refreshToken = authResponse.AuthenticationResult?.RefreshToken;
	return {
		statusCode: 200,
		body: JSON.stringify({
			accessToken: accessToken,
			idToken: idToken,
			refreshToken: refreshToken,
		}),
	};
})
	.use(bodyValidator(signinSchema))
	.use(errorHandler());

const signupSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	role: z.enum(["admin", "packer"]),
	name: z.string(),
});
export const signup = middy(async (event) => {
	const { name, email, role, password } = JSON.parse(event.body);
	const adminCreateUserParams = {
		UserPoolId: process.env.USER_POOL_ID,
		Username: email,
		UserAttributes: [
			{ Name: "email", Value: email },
			{ Name: "name", Value: name },
			{ Name: "custom:role", Value: role },
			{ Name: "email_verified", Value: "true" },
		],
		MessageAction: "SUPPRESS",
	};
	await cognitoClient.send(new AdminCreateUserCommand(adminCreateUserParams));

	// Set the user's password
	const adminSetUserPasswordParams = {
		UserPoolId: process.env.USER_POOL_ID,
		Username: email,
		Password: password,
		Permanent: true,
	};
	await cognitoClient.send(
		new AdminSetUserPasswordCommand(adminSetUserPasswordParams)
	);

	return {
		statusCode: 200,
		body: JSON.stringify({ message: "User created successfully" }),
	};
})
	.use(bodyValidator(signupSchema))
	.use(errorHandler());

const forgotPassSchema = z.object({
	email: emailSchema,
});

export const forgotPassword = middy(async (event) => {
	const { email } = JSON.parse(event.body);
	const forgotPasswordParams = {
		ClientId: process.env.COGNITO_CLIENT,
		Username: email,
	};
	const forgotPasswordCommand = new ForgotPasswordCommand(
		forgotPasswordParams
	);
	await cognitoClient.send(forgotPasswordCommand);

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

export const resetPassword = middy(async (event) => {
	const { email, confirmationCode, newPassword } = JSON.parse(event.body);
	const input = {
		ClientId: process.env.COGNITO_CLIENT,
		Username: email,
		ConfirmationCode: confirmationCode,
		Password: newPassword,
	};
	const command = new ConfirmForgotPasswordCommand(input);
	await cognitoClient.send(command);
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
		console.log(JSON.stringify(authResponse));
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

import { numberExists, saveOtp, validateOtp, createRider } from ".";

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
	const item = await numberExists(number, userType);
	console.log(1);
	if (item && item.length > 0) {
		const command = new AdminInitiateAuthCommand({
			AuthFlow: "CUSTOM_AUTH",
			UserPoolId: process.env.USER_POOL_ID,
			ClientId: process.env.COGNITO_CLIENT,
			AuthParameters: {
				USERNAME: number,
			},
		});

		const response = await cognitoClient.send(command);

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "OTP sent successfully",
				session: response.session,
			}),
		};
	}

	console.log(2);
	const userId = crypto.randomUUID();
	const date = new Date();
	const createCommand = new AdminCreateUserCommand({
		UserPoolId: process.env.USER_POOL_ID,
		Username: `+91${number}`,
		UserAttributes: [
			{ Name: "phone_number", Value: `+91${number}` },
			{ Name: "custom:userId", Value: userId },
			{ Name: "custom:role", Value: "rider" },
		],
		MessageAction: "SUPPRESS",
	});
	console.log(JSON.stringify(createCommand, null, 2));
	console.log(3);
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

export const numbersign = middy(async (event) => {
	const body = JSON.parse(event.body);
	const { number, code } = body;
	// Verify OTP
	console.log(1);
	const command = new RespondToAuthChallengeCommand({
		ClientId: process.env.COGNITO_CLIENT,
		ChallengeName: "CUSTOM_CHALLENGE",
		ChallengeResponses: {
			USERNAME: number,
			ANSWER: code,
		},
	});
	console.log(2);

	const response = await cognitoClient.send(command);
	console.log(3);

	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "Signed in successfully",
			tokens: {
				accessToken: response.AuthenticationResult?.AccessToken,
				idToken: response.AuthenticationResult?.IdToken,
				refreshToken: response.AuthenticationResult?.RefreshToken,
			},
		}),
	};
}).use(errorHandler());
