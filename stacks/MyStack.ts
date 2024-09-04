import * as iam from "aws-cdk-lib/aws-iam";
import { Bucket, Table, StackContext, Api, Config, use } from "sst/constructs";
import { AuthStack } from "./AuthStack";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
export function API({ stack }: StackContext) {
	const mediaBucket = new Bucket(stack, "mediaBucket", {
		cors: [
			{
				allowedOrigins: ["*"],
				allowedHeaders: ["*"],
				allowedMethods: ["GET", "PUT", "POST"],
			},
		],
	});

	const getObjectPolicy = new iam.PolicyStatement({
		actions: ["s3:GetObject"],
		effect: iam.Effect.ALLOW,
		resources: [mediaBucket.bucketArn + "/*"],
		principals: [new iam.AnyPrincipal()],
	});

	mediaBucket.cdk.bucket.addToResourcePolicy(getObjectPolicy);

	const orderTable = dynamodb.Table.fromTableArn(
		stack,
		"orderTable",
		"arn:aws:dynamodb:us-east-1:851725323791:table/Orders"
	);

	const ORDER_TABLE = new Config.Parameter(stack, "ORDER_TABLE", {
		value: orderTable.tableName,
	});

	const usersTable = dynamodb.Table.fromTableArn(
		stack,
		"usersTable",
		"arn:aws:dynamodb:us-east-1:851725323791:table/Users"
	);

	const USERS_TABLE = new Config.Parameter(stack, "USERS_TABLE", {
		value: usersTable.tableName,
	});

	const cognito = use(AuthStack);

	const inventoryTable = new Table(stack, "inventoryTable", {
		fields: {
			id: "string",
			name: "string",
			category: "string", 
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			nameIndex: { partitionKey: "name" },
			categoryIndex: { partitionKey: "category" }, 
		},
	});

	const inventoryModificationTable = new Table(
		stack,
		"inventoryModificationTable",
		{
			fields: {
				id: "string",
				reason: "string",
				description: "string",
				date: "string",
				adjustedBy: "string",
				location: "string",
				items: "string",
			},
			primaryIndex: { partitionKey: "id" },
		}
	);
	const tables = [inventoryTable, inventoryModificationTable];

	const api = new Api(stack, "api", {
		// authorizers: {
		// 	UserPoolAuthorizer: {
		// 		type: "user_pool",
		// 		userPool: {
		// 			id: cognito.userPoolId,
		// 			clientIds: [cognito.userPoolClientId],
		// 		},
		// 	},
		// },
		defaults: {
			function: {
				bind: tables,
			},
			// authorizer: "UserPoolAuthorizer",
		},
		routes: {
			"POST /auth/signup": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.signup",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
					permissions: [
						"cognito-idp:AdminCreateUser",
						"cognito-idp:AdminConfirmSignUp",
						"cognito-idp:AdminUpdateUserAttributes",
						"cognito-idp:AdminSetUserPassword",
					],
				},
			},
			"POST /auth/signin": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.signin",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
				},
			},
			"POST /auth/signout": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.signout",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
				},
			},
			"POST /auth/forgot-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.forgotPassword",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
				},
			},
			"POST /auth/reset-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.resetPassword",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
				},
			},
			"POST /auth/change-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.changePassword",
					environment: {
						USER_POOL_ID: cognito.userPoolId,
						COGNITO_CLIENT: cognito.userPoolClientId,
					},
					permissions: ["cognito-idp:AdminInitiateAuth"],
				},
			},
			"GET /inventory": {
				function: {
					handler:
						"packages/functions/api/inventory/get-items.handler",
				},
			},
			"GET /inventory/{id}": {
				function: {
					handler:
						"packages/functions/api/inventory/get-item.handler",
				},
			},
			"GET /inventory/stats": {
				function: {
					handler:
						"packages/functions/api/inventory/inventory-stats.handler",
				},
			},
			"POST /inventory": {
				function: {
					handler:
						"packages/functions/api/inventory/add-item.handler",
				},
			},
			"PUT /inventory/status": {
				function: {
					handler:
						"packages/functions/api/inventory/update-item-status.handler",
				},
			},
			"PUT /inventory/price": {
				function: {
					handler:
						"packages/functions/api/inventory/update-item-price.handler",
				},
			},
			"POST /inventory/adjust": {
				function: {
					handler:
						"packages/functions/api/inventory/inventory-mod.add",
				},
			},
			"GET /inventory/adjust": {
				function: {
					handler:
						"packages/functions/api/inventory/inventory-mod.list",
				},
			},
			"GET /uploadUrl": {
				function: {
					handler:
						"packages/functions/api/media/getPreSignedS3url.handler",
					bind: [mediaBucket],
				},
			},
			"GET /order": {
				function: {
					handler: "packages/functions/api/order/get-orders.handler",
					permissions: [orderTable],
					bind: [ORDER_TABLE],
				},
			},
			"GET /order/{id}": {
				function: {
					handler: "packages/functions/api/order/get-order.handler",
					permissions: [orderTable, usersTable],
					bind: [ORDER_TABLE, USERS_TABLE],
				},
			},
			"GET /order/stats": {
				function: {
					handler: "packages/functions/api/order/order-stats.handler",
					permissions: [orderTable],
					bind: [ORDER_TABLE],
				},
			},
			"PUT /order/proceed": {
				function: {
					handler:
						"packages/functions/api/order/proceed-order.handler",
					permissions: [orderTable, "states:SendTaskSuccess"],
					bind: [ORDER_TABLE],
				},
			},
		},
	});

	stack.addOutputs({
		LambdaApiEndpoint: api.url,
	});

	return {
		api,
		ORDER_TABLE,
		orderTable,
	};
}
