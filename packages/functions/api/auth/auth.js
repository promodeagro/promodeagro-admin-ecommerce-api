import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
	region: "us-east-1",
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
		const signUpParams = {
			ClientId: process.env.COGNITO_CLIENT,
			Username: email,
			Password: password,
			UserAttributes: [
				{ Name: "email", Value: email },
				{ Name: "name", Value: name },
				{ Name: "custom:role", Value: role },
			],
		};
		const signUpCommand = new SignUpCommand(signUpParams);
		const signUpResult = await cognitoClient.send(signUpCommand);

		const confirmSignUpCommand = new AdminConfirmSignUpCommand({
			UserPoolId: process.env.USER_POOL_ID,
			Username: email,
		});
		await cognitoClient.send(confirmSignUpCommand);

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

// export const preSignUp = async (event) => {
// 	event.response.autoConfirmUser = true;
// 	return event;
// };
