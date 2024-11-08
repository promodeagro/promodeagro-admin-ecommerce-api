import {
	DateTimeAttribute,
	StringAttribute,
	UserPoolClientIdentityProvider
} from "aws-cdk-lib/aws-cognito";
import { Cognito, StackContext, Function, Config } from "sst/constructs";

export function AuthStack({ stack }: StackContext) {

	const SMS_AUTH = new Config.Secret(stack, "SMS_AUTH");
	const SMS_AUTH_TOKEN = new Config.Secret(stack, "SMS_AUTH_TOKEN");

	const defineAuthChallenge = new Function(stack, "DefineAuthChallenge", {
		handler: "packages/functions/api/auth/defineAuthChallenge.handler",
		timeout: 10,
	});

	const createAuthChallenge = new Function(stack, "CreateAuthChallenge", {
		handler: "packages/functions/api/auth/createAuthChallenge.handler",
		timeout: 10,
		bind: [SMS_AUTH, SMS_AUTH_TOKEN],
	});

	const verifyAuthChallenge = new Function(stack, "VerifyAuthChallenge", {
		handler: "packages/functions/api/auth/verifyAuthChallenge.handler",
		timeout: 10,
	});

	const preSignUp = new Function(stack, "PreSignUp", {
		handler: "packages/functions/api/auth/preSignUp.handler",
		timeout: 10,
	});

	const cognito1 = new Cognito(stack, "Auth1", {
		login: ["email", "phone"],
		cdk: {
			userPool: {
				selfSignUpEnabled: true,
				signInAliases: {
					email: true,
					phone: true,
				},
				standardAttributes: {
					email: {
						required: false,
						mutable: true,
					},
					phoneNumber: {
						required: false,
						mutable: true,
					},
				},
				customAttributes: {
					userId: new StringAttribute({
						mutable: false,
					}),
					role: new StringAttribute({
						mutable: false,
					}),
					createdAt: new DateTimeAttribute(),
				},
			},
			userPoolClient: {
				authFlows: {
					userPassword: true,
					adminUserPassword: true,
					custom: true,
					userSrp: true,
				},
				supportedIdentityProviders: [
					UserPoolClientIdentityProvider.COGNITO,
				],
			},
		},
		triggers: {
			defineAuthChallenge: defineAuthChallenge,
			createAuthChallenge: createAuthChallenge,
			verifyAuthChallengeResponse: verifyAuthChallenge,
			preSignUp: preSignUp,
		}
	});

	return cognito1;
}