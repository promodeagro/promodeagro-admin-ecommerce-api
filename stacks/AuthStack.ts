import {
	DateTimeAttribute,
	StringAttribute,
	UserPoolClientIdentityProvider
} from "aws-cdk-lib/aws-cognito";
import { Cognito, StackContext, Function } from "sst/constructs";

export function AuthStack({ stack }: StackContext) {
	const defineAuthChallenge = new Function(stack, "DefineAuthChallenge", {
		handler: "packages/functions/api/auth/defineAuthChallenge.handler",
		timeout: 10,
	});

	const createAuthChallenge = new Function(stack, "CreateAuthChallenge", {
		handler: "packages/functions/api/auth/createAuthChallenge.handler",
		timeout: 10,
		environment: {
			OTP_SERVICE_API_KEY: process.env.OTP_SERVICE_API_KEY || "",
		},
	});

	const verifyAuthChallenge = new Function(stack, "VerifyAuthChallenge", {
		handler: "packages/functions/api/auth/verifyAuthChallenge.handler",
		timeout: 10,
	});

	const preSignUp = new Function(stack, "PreSignUp", {
		handler: "packages/functions/api/auth/preSignUp.handler",
		timeout: 10,
	});

	const cognito = new Cognito(stack, "Auth", {
		login: ["email"],
		cdk: {
			userPool: {
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
					adminUserPassword: true
				},
			},
		},
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

	return { cognito, cognito1 };
}