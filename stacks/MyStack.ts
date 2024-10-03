import * as iam from "aws-cdk-lib/aws-iam";
import { Bucket, Table, StackContext, Api, use } from "sst/constructs";
import { AuthStack } from "./AuthStack";
export function API({ app, stack }: StackContext) {
	const isProd = app.stage == "prod"

	const mediaBucket = new Bucket(stack, "mediaBucket", {
		name: isProd ? "promodeagro-media-bucket" : "dev-promodeagro-media-bucket",
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

	const usersTable = new Table(stack, "Users", {
		fields: {
			UserId: "string",
			MobileNumber: "string",
			name: "string"
		},
		primaryIndex: { partitionKey: "UserId" },
		globalIndexes: {
			[`MobileNumber-index`]: { partitionKey: "MobileNumber" },
			[`Name-index`]: { partitionKey: "name" },

		},
	});

	const addressesTable = new Table(stack, "Addresses", {
		fields: {
			userId: "string",
			addressId: "string"
		},
		primaryIndex: { partitionKey: "userId", sortKey: "addressId" },
	});
	
	const SaveForLaterTable = new Table(stack, "SaveForLater", {
		fields: {
			userId: "string",
			productId: "string"
		},
		primaryIndex: { partitionKey: "userId", sortKey: "productId" },
	});

	const cartTable = new Table(stack, "CartItems", {
		fields: {
			UserId: "string",
			ProductId: "string",
		},
		primaryIndex: { partitionKey: "UserId", sortKey: "ProductId" },
	});

	const deliverySlotsTable = new Table(stack, "DeliveryTimeSlots", {
		fields: {
			slotId: "string",
		},
		primaryIndex: { partitionKey: "slotId" },
	});

	// Reviews Table
	const reviewsTable = new Table(stack, "UserReviews", {
		fields: {
			reviewId: "string",
			productId: "string",
		},
		primaryIndex: { partitionKey: "reviewId" },
		globalIndexes: {
			[`productId-index`]: { partitionKey: "productId" },
		},
	});

	const OrdersTable = new Table(stack, "OrdersTable", {
		fields: {
			id: "string",
			createdAt: "string",
			status: "string",
			userId: "string",
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			idCreatedAtIndex: { partitionKey: "id", sortKey: "createdAt" },
			statusCreatedAtIndex: { partitionKey: "status", sortKey: "createdAt" },
			userIdIndex: { partitionKey: "userId" },
		},
	});

	const ProductWishLists = new Table(stack, "ProductWishLists", {
		fields: {
			UserId: "string",
			ProductId: "string"
		},
		primaryIndex: { partitionKey: "UserId", sortKey: "ProductId" }
	});

	const ProductsOffers = new Table(stack, "ProductsOffers", {
		fields: {
			UserId: "string",
		},
		primaryIndex: { partitionKey: "UserId" },
	});
	const salesTable = new Table(stack, "sales", {
		fields: {
			orderId: "string",
			productId: "string"
		},
		primaryIndex: { partitionKey: "orderId", sortKey: "productId" },
	});

	const cognito = use(AuthStack);

	const inventoryTable = new Table(stack, "inventoryTable", {
		fields: {
			id: "string",
			productId: "string",
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			productIdIndex: { partitionKey: "productId" },
		},
	});

	const productsTable = new Table(stack, "productsTable", {
		fields: {
			id: "string",
			name: "string",
			category: "string",
			subCategory: "string",
			search_name: "string"
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			nameIndex: { partitionKey: "name" },
			categoryIndex: { partitionKey: "category" },
			subCategoryIndex: { partitionKey: "subCategory" },
			search_nameIndex: { partitionKey: "search_name" },
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
				createdAt: "string",
				updatedAt: "string"
			},
			primaryIndex: { partitionKey: "id" },
			globalIndexes: {
				createdAtIndex: { partitionKey: "createdAt" }
			}
		}
	);

	const inventoryStatsTable = new Table(stack, "inventoryStatsTable", {
		fields: {
			id: "string",
		},
		primaryIndex: { partitionKey: "id" },
	});
	const tables = [
		inventoryTable,
		inventoryModificationTable,
		productsTable,
		inventoryStatsTable,
		OrdersTable,
		addressesTable,
		usersTable
	];

	const api = new Api(stack, "api", {
		customDomain: isProd ?
			{
				domainName: "api.admin.promodeagro.com",
				hostedZone: "promodeagro.com"
			} : undefined,
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
			"GET /inventory": "packages/functions/api/inventory/get-items.handler",
			"GET /inventory/{id}": "packages/functions/api/inventory/get-item.handler",
			"GET /inventory/stats": "packages/functions/api/inventory/inventory-stats.handler",
			"POST /inventory": "packages/functions/api/inventory/add-item.handler",
			"PUT /inventory/status": "packages/functions/api/inventory/update-item-status.handler",
			"PUT /inventory/price": "packages/functions/api/inventory/update-item-price.handler",
			"POST /inventory/adjust": "packages/functions/api/inventory/inventory-mod.add",
			"GET /inventory/adjust": "packages/functions/api/inventory/inventory-mod.list",
			"DELETE /inventory/{id}": "packages/functions/api/inventory/delete-item.handler",
			"PUT /inventory/{id}": "packages/functions/api/inventory/update-item.handler",
			"GET /uploadUrl": {
				function: {
					handler:
						"packages/functions/api/media/getPreSignedS3url.handler",
					bind: [mediaBucket],
				},
			},
			"DELETE /deleteImage": {
				function: {
					handler:
						"packages/functions/api/media/getPreSignedS3url.deleteImage",
					bind: [mediaBucket],
				},
			},
			"GET /order": "packages/functions/api/order/get-orders.handler",
			"GET /order/{id}": "packages/functions/api/order/get-order.handler",
			"GET /order/stats": "packages/functions/api/order/order-stats.handler",
			"PUT /order/proceed": "packages/functions/api/order/proceed-order.handler",
		},
	});

	stack.addOutputs({
		LambdaApiEndpoint: api.url,
	});

	return {
		api,
		OrdersTable
	};
}
