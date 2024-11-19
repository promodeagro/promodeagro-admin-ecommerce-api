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
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { Table } from "sst/node/table";
import { getCognitoKeys } from "./middleware";
import crypto from "crypto";
import { save, update } from "../../common/data";
// import { generateTokens } from ./jwt";
const cognitoClient = new CognitoIdentityProviderClient({
	region: "ap-south-1",
});

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const riderTable = Table.riderTable.tableName;
const usersTable = Table.promodeagroUsers.tableName;
// const packerTable = Table.packerTable.tableName;

// const getTableName = (userType) => {
// 	return userType === "rider" ? riderTable : packerTable;
// };

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
	const user = { id: id, email, role, name };
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
	const kid = decodedHeader?.header.kid;

	if (!kid) {
		return {
			statusCode: 403,
			body: "Unauthorized",
		};
	}
	const keys = await getCognitoKeys();
	const key = keys.find((k) => k.kid === kid);
	const pem = jwkToPem(key);

	const decoded = jwt.verify(idToken, pem);
	if (!(decoded["custom:role"] === "admin")) {
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

export const numberExists = async (number, userType) => {
	const params = {
		TableName: riderTable,
		IndexName: "numberIndex",
		KeyConditionExpression: "#number = :number",
		ExpressionAttributeNames: {
			"#number": "number",
		},
		ExpressionAttributeValues: {
			":number": number,
		},
	};
	const command = new QueryCommand(params);
	const res = await docClient.send(command);
	return res.Items;
};

export const saveOtp = async (id, otp, userType) => {
	await update(
		riderTable,
		{
			id: id,
		},
		{
			otp: otp,
			otpExpire: Math.floor(Date.now() / 1000) + 180,
			updatedAt: new Date().toISOString(),
		}
	);
};

export const validateOtp = async (otp, number, userType) => {
	const params = {
		TableName: riderTable,
		IndexName: "numberIndex",
		KeyConditionExpression: "#number = :number",
		ExpressionAttributeNames: {
			"#number": "number",
		},
		ExpressionAttributeValues: {
			":number": number,
		},
		Limit: 1,
	};
	const result = await docClient.send(new QueryCommand(params));
	if (!result.Items || result.Items.length === 0) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "Number not found",
			}),
		};
	}
	const resOtp = result.Items[0].otp;
	const expired = result.Items[0].otpExpire;
	if (resOtp == otp) {
		if (Math.floor(Date.now() / 1000) > expired) {
			return {
				statusCode: 401,
				body: JSON.stringify({
					message: "otp expired",
				}),
			};
		}
		const user = result.Items[0];
		delete user.otp;
		delete user.otpExpire;
		// const tokens = generateTokens({
		// 	id: result.Items[0].id,
		// 	number: number,
		// 	userType: userType,
		// });
		return {
			statusCode: 200,
			body: JSON.stringify(user),
		};
	}
	return {
		statusCode: 401,
		body: JSON.stringify({
			message: "Invalid OTP",
		}),
	};
};

export const createRider = async (number) => {
	const id = crypto.randomUUID();
	const rider = {
		id: id,
		number: number,
		profileStatus: {
			personalInfoCompleted: false,
			bankDetailsCompleted: false,
			documentsCompleted: false,
		},
		personalDetails: {},
		bankDetails: {},
		documents: {},
		reviewStatus: "not_submitted",
		submittedAt: null,
		accountVerified: false,
	};
	return await save(riderTable, rider);
};
