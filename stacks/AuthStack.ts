import { DateTimeAttribute, StringAttribute } from "aws-cdk-lib/aws-cognito";
import { Cognito, StackContext } from "sst/constructs";

export function AuthStack({ stack }: StackContext) {
	const cognito = new Cognito(stack, "Auth", {
		login: ["email"],
		triggers: {
			preSignUp: "packages/functions/api/auth/auth.preSignUp",
		},
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
				},
			},
		},
	});

	return cognito;
}
