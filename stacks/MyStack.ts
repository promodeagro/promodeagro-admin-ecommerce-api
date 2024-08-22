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

	const inventoryTable = dynamodb.Table.fromTableArn(
		stack,
		"inventortyTable",
		"arn:aws:dynamodb:us-east-1:851725323791:table/Inventory"
	);
	const INVENTORY_TABLE = new Config.Parameter(stack, "INVENTORY_TABLE", {
		value: inventoryTable.tableName,
	});

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

	const adminUsersTable = new Table(stack, "adminUsersTable", {
		fields: {
			id: "string",
			email: "string",
			name: "string",
			role: "string",
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			byEmail: { partitionKey: "email" },
		},
	});
	const tables = [adminUsersTable];

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
					permissions: [],
					// 	COGNITO_CLIENT: cognito.userPoolClientId,
					// },
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
					permissions: [],
					// 	COGNITO_CLIENT: cognito.userPoolClientId,
					// },
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
					permissions: [],
					// 	COGNITO_CLIENT: cognito.userPoolClientId,
					// },
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
					// 	COGNITO_CLIENT: cognito.userPoolClientId,
					// },
				},
			},
			"GET /inventory": {
				function: {
					handler:
						"packages/functions/api/inventory/get-items.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
				},
			},
			"GET /inventory/{id}": {
				function: {
					handler:
						"packages/functions/api/inventory/get-item.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
				},
			},
			"GET /inventory/stats": {
				function: {
					handler:
						"packages/functions/api/inventory/inventory-stats.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
				},
			},
			"POST /inventory": {
				function: {
					handler:
						"packages/functions/api/inventory/add-item.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
				},
			},
			"PUT /inventory/status": {
				function: {
					handler:
						"packages/functions/api/inventory/update-item-status.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
				},
			},
			"PUT /inventory/{id}/price": {
				function: {
					handler:
						"packages/functions/api/inventory/update-item-price.handler",
					permissions: [inventoryTable],
					bind: [INVENTORY_TABLE],
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
