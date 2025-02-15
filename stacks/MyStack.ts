import * as iam from "aws-cdk-lib/aws-iam";
import { Function, Bucket, Table, StackContext, Api, use, EventBus, Config } from "sst/constructs";
import { AuthStack } from "./AuthStack";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export function API({ app, stack }: StackContext) {

	const API_URL = new Config.Secret(stack, "API_URL")
	const FACEBOOK_ACCESS_TOKEN = new Config.Secret(stack, "FACEBOOK_ACCESS_TOKEN")
	const CATALOG_ID = new Config.Secret(stack, "CATALOG_ID")
	const SENDGRID_API_KEY = new Config.Secret(stack, "SENDGRID_API_KEY")

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

	const promodeagroUsers = new Table(stack, "promodeagroUsers", {
		fields: {
			id: "string",
			email: "string",
			number: "string"
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			[`emailIndex`]: { partitionKey: "email" },
			[`numberIndex`]: { partitionKey: "number" },

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

	const cognito1 = use(AuthStack);

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

	const runsheetTable = new Table(stack, "runsheetTable", {
		fields: {
			id: "string",
			riderId: "string",
			status: "string",
			createdAt: "string"
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			riderIndex: { partitionKey: "riderId" },
			statusCreatedAtIndex: {
				partitionKey: "status",
				sortKey: "createdAt"
			}
		}
	});

	const pincodeTable = new Table(stack, "pincodeTable", {
		fields: {
			pincode: "string",
			deliveryType: "string",
			shifts: "string",
			active: "binary"
		},
		primaryIndex: { partitionKey: "pincode" },
	});

	const notificationsTable = new Table(stack, "notificationsTable", {
		fields: {
			id: "string",
			type: "string",
			userId: "string",
			message: "string",
			read: "binary",
			createdAt: "string",
			metadata: "string",
			ttl: "number"
		},
		primaryIndex: { partitionKey: "id" },
		globalIndexes: {
			userIndex: { partitionKey: "userId" }
		},
		timeToLiveAttribute: "ttl"
	});

	const bus = new EventBus(stack, "bus", {
		defaults: {
			retries: 10,
		},
	});

	bus.subscribe("Product.PriceUpdate", {
		handler: "packages/functions/api/inventory/add-whatsapp-comm.handler",
		bind: [API_URL, FACEBOOK_ACCESS_TOKEN, CATALOG_ID, inventoryTable]
	});

	const api = new Api(stack, "api", {
		customDomain: isProd ? {
			domainName: "api.admin.promodeagro.com",
			hostedZone: "promodeagro.com"
		} : undefined,
		authorizers: isProd ? {
			myAuthorizer: {
				type: "lambda",
				function: new Function(stack, "Auuthorizer", {
					handler: "packages/functions/api/auth/middleware.authorizer",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
					}
				})
			}
		} : undefined,
		defaults: {
			// authorizer: isProd ? "myAuthorizer" : "none",
			authorizer: "none",
			function: {
				bind: [inventoryTable,
					inventoryModificationTable,
					productsTable,
					OrdersTable, runsheetTable,
					notificationsTable,
					usersTable, bus, promodeagroUsers, pincodeTable, SENDGRID_API_KEY],
				environment: {
					USER_POOL_ID: cognito1.userPoolId,
					COGNITO_CLIENT: cognito1.userPoolClientId,
				}
			},
		},
		routes: {
			"POST /auth/signup": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.signupHandler",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
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
					handler: "packages/functions/api/auth/auth.signinHandler",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
					},
				},
			},
			"POST /auth/signout": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.signout",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
					},
				},
			},
			"POST /auth/forgot-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.forgotPasswordHandler",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
					},
				},
			},
			"POST /auth/reset-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.resetPasswordHandler",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
					},
				},
			},
			"POST /auth/change-password": {
				authorizer: "none",
				function: {
					handler: "packages/functions/api/auth/auth.changePassword",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
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
			"GET /order-inventory": "packages/functions/api/order/get-orders-inventory.handler",
			"GET /order/{id}": "packages/functions/api/order/get-order.handler",
			"PUT /order/{id}/cancel": "packages/functions/api/order/cancel-order.handler",
			"PUT /order/{id}/reattempt": "packages/functions/api/order/reattempt-order.handler",
			"GET /order/stats": "packages/functions/api/order/order-stats.handler",
			"PUT /order/proceed": "packages/functions/api/order/proceed-order.handler",
			"PUT /order/pack": "packages/functions/api/order/assign-packer.handler",
			"POST /runsheet": "packages/functions/api/runsheet/runsheet.createRunsheetHandler",
			"GET /runsheet": "packages/functions/api/runsheet/runsheet.listRunsheetHandler",
			"GET /runsheet/cash-collection": "packages/functions/api/runsheet/runsheet.cashCollectionListHandler",
			"GET /runsheet/{id}": "packages/functions/api/runsheet/runsheet.getRunsheetHandler",
			"PUT /runsheet/{id}/close": "packages/functions/api/runsheet/runsheet.closeRunsheetHandler",
			"GET /rider": "packages/functions/api/rider/rider.listRidersHandler",
			"GET /rider/{id}": "packages/functions/api/rider/rider.getRiderHandler",
			"PATCH /rider/{id}": "packages/functions/api/rider/rider.patchRiderHandler",
			"PATCH /rider/{id}/document": "packages/functions/api/rider/rider.patchDocuemntHandler",
			"POST /pincode": "packages/functions/api/pincode/pincode.createPincodeHandler",
			"PUT /pincode": "packages/functions/api/pincode/pincode.updatePincodeHandler",
			"PATCH /pincode/status": "packages/functions/api/pincode/pincode.changeActiveStatusHandler",
			"PATCH /pincode/delivery-type": "packages/functions/api/pincode/pincode.changeDeliveryTypeHandler",
			"GET /pincode": "packages/functions/api/pincode/pincode.listhandler",
			"POST /admin/create-user": {
				function: {
					handler: "packages/functions/api/rbac/rbac.createNewUserHandler",
					environment: {
						USER_POOL_ID: cognito1.userPoolId,
						COGNITO_CLIENT: cognito1.userPoolClientId,
					},
					permissions: [
						"cognito-idp:AdminCreateUser",
						"cognito-idp:AdminConfirmSignUp",
						"cognito-idp:AdminUpdateUserAttributes",
						"cognito-idp:AdminSetUserPassword",
					],
					bind: [SENDGRID_API_KEY]
				}
			},
			"GET /admin/users": "packages/functions/api/rbac/rbac.listUsersHandler",
			"GET /admin/users/{id}": "packages/functions/api/rbac/rbac.getUserHandler",
			"PATCH /admin/users": "packages/functions/api/rbac/rbac.changeActiveStatusHandler",
			"GET /notification/{id}": "packages/functions/api/notification/notification.listHandler",
		},
	});

	stack.addOutputs({
		LambdaApiEndpoint: api.url,
		API_URL: API_URL.name,
		FACEBOOK_ACCESS_TOKEN: FACEBOOK_ACCESS_TOKEN.name,
		CATALOG_ID: CATALOG_ID.name,
	});

	return {
		api,
		OrdersTable,
	};
}
