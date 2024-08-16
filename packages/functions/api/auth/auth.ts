import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import { SignInRequest, SignInRequestSchema } from "../../types/auth";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const cognitoClient = new CognitoIdentityProviderClient({
	region: "us-east-1",
});

export const signIn: APIGatewayProxyHandler = middy(
	async (event: APIGatewayProxyEvent) => {
		const signIn = JSON.parse(event.body || "{}") as SignInRequest;

		const input: InitiateAuthCommandInput = {
			ClientId: process.env.COGNITO_CLIENT,
			AuthFlow: "USER_PASSWORD_AUTH",
			AuthParameters: {
				USERNAME: signIn.email,
				PASSWORD: signIn.password,
			},
		};

		const authResponse = await cognitoClient.send(
			new InitiateAuthCommand(input)
		);

		const accessToken = authResponse.AuthenticationResult?.IdToken;
		const refreshToken = authResponse.AuthenticationResult?.RefreshToken;
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				accessToken: accessToken,
				refreshToken: refreshToken,
			}),
		};
	}
)
	.use(bodyValidator(SignInRequestSchema))
	.use(errorHandler());

export const preSignUp = async (event) => {
	event.response.autoConfirmUser = true;
	return event;
};
