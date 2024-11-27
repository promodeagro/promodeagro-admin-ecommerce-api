import {
	AdminCreateUserCommand,
	AdminInitiateAuthCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
	ConfirmForgotPasswordCommand,
	ForgotPasswordCommand,
	InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Table } from "sst/node/table";
import { save } from "../../common/data";

const cognitoClient = new CognitoIdentityProviderClient({
	region: "ap-south-1",
});

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const usersTable = Table.promodeagroUsers.tableName;

export const signup = async ({ email, name, role, password }) => {
	const item = await emailExits(email);
	if (item && item.length > 0) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "email already used",
			}),
		};
	}
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
	const adminSetUserPasswordParams = {
		UserPoolId: process.env.USER_POOL_ID,
		Username: email,
		Password: password,
		Permanent: true,
	};
	await cognitoClient.send(
		new AdminSetUserPasswordCommand(adminSetUserPasswordParams)
	);
	const id = crypto.randomUUID();
	const user = { id: id, email, role, name, active: true };
	await save(usersTable, user);
	return await signin({
		email,
		password,
	});
};
export const signin = async ({ email, password }) => {
	const authResponse = await initiateEmailAuth({ email, password });
	const accessToken = authResponse.AuthenticationResult?.AccessToken;
	const idToken = authResponse.AuthenticationResult?.IdToken;
	const refreshToken = authResponse.AuthenticationResult?.RefreshToken;

	const decodedHeader = jwt.decode(idToken, { complete: true });
	if (!(decodedHeader.payload["custom:role"] === "admin")) {
		return {
			statusCode: 403,
			body: "Unauthorized",
		};
	}
	return {
		statusCode: 200,
		body: JSON.stringify({
			accessToken: accessToken,
			idToken: idToken,
			refreshToken: refreshToken,
		}),
	};
};

export const refreshTokens = async (refreshToken) => {
	const command = new AdminInitiateAuthCommand({
		AuthFlow: "REFRESH_TOKEN_AUTH",
		UserPoolId: process.env.USER_POOL_ID,
		ClientId: process.env.COGNITO_CLIENT,
		AuthParameters: {
			REFRESH_TOKEN: refreshToken,
		},
	});
	const res = await cognitoClient.send(command);
	return {
		accessToken: res.AuthenticationResult.AccessToken,
		idToken: res.AuthenticationResult.AccessToken,
		expiresIn: res.AuthenticationResult.ExpiresIn,
	};
};

export const forgotPassword = async (email) => {
	const forgotPasswordParams = {
		ClientId: process.env.COGNITO_CLIENT,
		Username: email,
	};
	const forgotPasswordCommand = new ForgotPasswordCommand(
		forgotPasswordParams
	);
	await cognitoClient.send(forgotPasswordCommand);
};

export const resetPassword = async ({
	email,
	confirmationCode,
	newPassword,
}) => {
	const input = {
		ClientId: process.env.COGNITO_CLIENT,
		Username: email,
		ConfirmationCode: confirmationCode,
		Password: newPassword,
	};
	const command = new ConfirmForgotPasswordCommand(input);
	await cognitoClient.send(command);
};

const initiateEmailAuth = async ({ email, password }) => {
	const authParams = {
		AuthFlow: "USER_PASSWORD_AUTH",
		UserPoolId: process.env.USER_POOL_ID,
		ClientId: process.env.COGNITO_CLIENT,
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	};
	const authCommand = new InitiateAuthCommand(authParams);
	return await cognitoClient.send(authCommand);
};

export const emailExits = async (email) => {
	const params = {
		TableName: usersTable,
		IndexName: "emailIndex",
		KeyConditionExpression: "#email = :email",
		ExpressionAttributeNames: {
			"#email": "email",
		},
		ExpressionAttributeValues: {
			":email": email,
		},
	};
	const command = new QueryCommand(params);
	const res = await docClient.send(command);
	return res.Items;
};
