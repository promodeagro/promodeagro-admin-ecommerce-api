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
} from "@aws-sdk/client-cognito-identity-provider";
import { save } from "../../common/data";

const cognitoClient = new CognitoIdentityProviderClient({
	region: "us-east-1",
});

// const emailSchema = z.string().email();

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

	const accessToken = authResponse.AuthenticationResult?.IdToken;
	const refreshToken = authResponse.AuthenticationResult?.RefreshToken;
	return {
		statusCode: 200,
		body: JSON.stringify({
			accessToken: accessToken,
			refreshToken: refreshToken,
		}),
	};
})
	// .use(bodyValidator(SignInRequestSchema))
	.use(errorHandler());

export const signup = async (event) => {
	console.log("1");
	const { name, email, role, password } = JSON.parse(event.body);
	try {
		console.log(process.env.USER_POOL_ID);
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
		await cognitoClient.send(
			new AdminCreateUserCommand(adminCreateUserParams)
		);

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

		await save(Table.adminUsersTable.tableName, {
			id: crypto.randomUUID(),
			email,
			name,
			role,
		});
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "User created successfully" }),
		};
	} catch (error) {
		console.error("Error creating user:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: error.message }),
		};
	}
};

export const forgotPassword = async (event) => {
	const { email } = JSON.parse(event.body);
	try {
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
				message:
					"Password reset instructions have been sent to your email",
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

export const resetPassword = async (event) => {
	const { email, confirmationCode, newPassword } = JSON.parse(event.body);
	const input = {
		ClientId: process.env.COGNITO_CLIENT,
		Username: email,
		ConfirmationCode: confirmationCode,
		Password: newPassword,
	};
	try {
		const command = new ConfirmForgotPasswordCommand(input);
		await cognitoClient.send(command);
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "password reset successfully",
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

//[ADMIN_NO_SRP_AUTH, ADMIN_USER_PASSWORD_AUTH, USER_SRP_AUTH, REFRESH_TOKEN_AUTH, REFRESH_TOKEN, CUSTOM_AUTH, USER_PASSWORD_AUTH]"}

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
