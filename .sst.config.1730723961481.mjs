import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// stacks/MyStack.ts
import * as iam from "aws-cdk-lib/aws-iam";
import { Bucket, Table, Api, use, EventBus, Config } from "sst/constructs";

// stacks/AuthStack.ts
import { DateTimeAttribute, StringAttribute } from "aws-cdk-lib/aws-cognito";
import { Cognito } from "sst/constructs";
function AuthStack({ stack }) {
  const cognito = new Cognito(stack, "Auth", {
    login: ["email"],
    cdk: {
      userPool: {
        customAttributes: {
          userId: new StringAttribute({
            mutable: false
          }),
          role: new StringAttribute({
            mutable: false
          }),
          createdAt: new DateTimeAttribute()
        }
      },
      userPoolClient: {
        authFlows: {
          userPassword: true,
          adminUserPassword: true
        }
      }
    }
  });
  return cognito;
}
__name(AuthStack, "AuthStack");

// stacks/MyStack.ts
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
function API({ app, stack }) {
  const API_URL = new Config.Secret(stack, "API_URL");
  const FACEBOOK_ACCESS_TOKEN = new Config.Secret(stack, "FACEBOOK_ACCESS_TOKEN");
  const CATALOG_ID = new Config.Secret(stack, "CATALOG_ID");
  const isProd = app.stage == "prod";
  const mediaBucket = new Bucket(stack, "mediaBucket", {
    name: isProd ? "promodeagro-media-bucket" : "dev-promodeagro-media-bucket",
    cors: [
      {
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        allowedMethods: ["GET", "PUT", "POST"]
      }
    ]
  });
  const getObjectPolicy = new iam.PolicyStatement({
    actions: ["s3:GetObject"],
    effect: iam.Effect.ALLOW,
    resources: [mediaBucket.bucketArn + "/*"],
    principals: [new iam.AnyPrincipal()]
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
      [`Name-index`]: { partitionKey: "name" }
    }
  });
  const addressesTable = new Table(stack, "Addresses", {
    fields: {
      userId: "string",
      addressId: "string"
    },
    primaryIndex: { partitionKey: "userId", sortKey: "addressId" }
  });
  const SaveForLaterTable = new Table(stack, "SaveForLater", {
    fields: {
      userId: "string",
      productId: "string"
    },
    primaryIndex: { partitionKey: "userId", sortKey: "productId" }
  });
  const cartTable = new Table(stack, "CartItems", {
    fields: {
      UserId: "string",
      ProductId: "string"
    },
    primaryIndex: { partitionKey: "UserId", sortKey: "ProductId" }
  });
  const deliverySlotsTable = new Table(stack, "DeliveryTimeSlots", {
    fields: {
      slotId: "string"
    },
    primaryIndex: { partitionKey: "slotId" }
  });
  const reviewsTable = new Table(stack, "UserReviews", {
    fields: {
      reviewId: "string",
      productId: "string"
    },
    primaryIndex: { partitionKey: "reviewId" },
    globalIndexes: {
      [`productId-index`]: { partitionKey: "productId" }
    }
  });
  const OrdersTable = new Table(stack, "OrdersTable", {
    fields: {
      id: "string",
      createdAt: "string",
      status: "string",
      userId: "string"
    },
    primaryIndex: { partitionKey: "id" },
    globalIndexes: {
      idCreatedAtIndex: { partitionKey: "id", sortKey: "createdAt" },
      statusCreatedAtIndex: { partitionKey: "status", sortKey: "createdAt" },
      userIdIndex: { partitionKey: "userId" }
    }
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
      UserId: "string"
    },
    primaryIndex: { partitionKey: "UserId" }
  });
  const salesTable = new Table(stack, "sales", {
    fields: {
      orderId: "string",
      productId: "string"
    },
    primaryIndex: { partitionKey: "orderId", sortKey: "productId" }
  });
  const cognito = use(AuthStack);
  const inventoryTable = new Table(stack, "inventoryTable", {
    fields: {
      id: "string",
      productId: "string"
    },
    primaryIndex: { partitionKey: "id" },
    globalIndexes: {
      productIdIndex: { partitionKey: "productId" }
    }
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
      search_nameIndex: { partitionKey: "search_name" }
    }
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
      id: "string"
    },
    primaryIndex: { partitionKey: "id" }
  });
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
  const riderTable = new Table(
    stack,
    "riderTable",
    {
      cdk: { table: dynamodb.Table.fromTableArn(this, "RIDER_TABLE", isProd ? "arn:aws:dynamodb:ap-south-1:851725323791:table/prod-promodeagro-rider-ridersTable" : "arn:aws:dynamodb:ap-south-1:851725323791:table/Sohail-Shah-promodeagro-rider-ridersTable") }
    }
  );
  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 10
    }
  });
  bus.subscribe("Product.PriceUpdate", {
    handler: "packages/functions/api/inventory/add-whatsapp-comm.handler",
    bind: [API_URL, FACEBOOK_ACCESS_TOKEN, CATALOG_ID, inventoryTable]
  });
  const api = new Api(stack, "api", {
    customDomain: isProd ? {
      domainName: "api.admin.promodeagro.com",
      hostedZone: "promodeagro.com"
    } : void 0,
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
        bind: [
          inventoryTable,
          inventoryModificationTable,
          productsTable,
          inventoryStatsTable,
          OrdersTable,
          runsheetTable,
          riderTable,
          usersTable,
          bus
        ]
      }
    },
    routes: {
      "POST /auth/signup": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.signup",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          },
          permissions: [
            "cognito-idp:AdminCreateUser",
            "cognito-idp:AdminConfirmSignUp",
            "cognito-idp:AdminUpdateUserAttributes",
            "cognito-idp:AdminSetUserPassword"
          ]
        }
      },
      "POST /auth/signin": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.signin",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          }
        }
      },
      "POST /auth/signout": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.signout",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          }
        }
      },
      "POST /auth/forgot-password": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.forgotPassword",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          }
        }
      },
      "POST /auth/reset-password": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.resetPassword",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          }
        }
      },
      "POST /auth/change-password": {
        authorizer: "none",
        function: {
          handler: "packages/functions/api/auth/auth.changePassword",
          environment: {
            USER_POOL_ID: cognito.userPoolId,
            COGNITO_CLIENT: cognito.userPoolClientId
          },
          permissions: ["cognito-idp:AdminInitiateAuth"]
        }
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
          handler: "packages/functions/api/media/getPreSignedS3url.handler",
          bind: [mediaBucket]
        }
      },
      "DELETE /deleteImage": {
        function: {
          handler: "packages/functions/api/media/getPreSignedS3url.deleteImage",
          bind: [mediaBucket]
        }
      },
      "GET /order": "packages/functions/api/order/get-orders.handler",
      "GET /order-inventory": "packages/functions/api/order/get-orders-inventory.handler",
      "GET /order/{id}": "packages/functions/api/order/get-order.handler",
      "PUT /order/{id}/cancel": "packages/functions/api/order/cancel-order.handler",
      "GET /order/stats": "packages/functions/api/order/order-stats.handler",
      "PUT /order/proceed": "packages/functions/api/order/proceed-order.handler",
      "POST /runsheet": "packages/functions/api/runsheet/runsheet.createRunsheetHandler",
      "GET /runsheet": "packages/functions/api/runsheet/runsheet.listRunsheetHandler",
      "GET /runsheet/cash-collection": "packages/functions/api/runsheet/runsheet.cashCollectionListHandler",
      "GET /runsheet/{id}": "packages/functions/api/runsheet/runsheet.getRunsheetHandler",
      "PUT /runsheet/{id}/close": "packages/functions/api/runsheet/runsheet.closeRunsheetHandler",
      "GET /rider": "packages/functions/api/rider/rider.listRidersHandler",
      "GET /rider/{id}": "packages/functions/api/rider/rider.getRiderHandler",
      "PATCH /rider/{id}": "packages/functions/api/rider/rider.patchRiderHandler",
      "PATCH /rider/{id}/document": "packages/functions/api/rider/rider.patchDocuemntHandler"
    }
  });
  stack.addOutputs({
    LambdaApiEndpoint: api.url,
    API_URL: API_URL.name,
    FACEBOOK_ACCESS_TOKEN: FACEBOOK_ACCESS_TOKEN.name,
    CATALOG_ID: CATALOG_ID.name
  });
  return {
    api,
    OrdersTable
  };
}
__name(API, "API");

// stacks/SFStack.ts
import { use as use2 } from "sst/constructs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Function } from "sst/constructs";
var SFStack = /* @__PURE__ */ __name(({ stack }) => {
  const { OrdersTable } = use2(API);
  const orderPlacedFn = new Function(stack, "OrderPlacedFunction", {
    handler: "packages/functions/api/order/order-process.handler",
    bind: [OrdersTable]
  });
  orderPlacedFn.attachPermissions(["dynamodb:PutItem"]);
  const definition = sfn.Chain.start(
    new tasks.LambdaInvoke(stack, "OrderPlaced", {
      lambdaFunction: orderPlacedFn,
      resultPath: "$",
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      retryOnServiceExceptions: true,
      payload: sfn.TaskInput.fromObject({
        body: sfn.JsonPath.stringAt("$"),
        token: sfn.JsonPath.taskToken,
        stateName: sfn.JsonPath.stringAt("$$.State.Name")
      })
    })
  ).next(
    new tasks.LambdaInvoke(stack, "Packed", {
      lambdaFunction: orderPlacedFn,
      resultPath: "$",
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      // payloadResponseOnly: true,
      retryOnServiceExceptions: true,
      payload: sfn.TaskInput.fromObject({
        body: sfn.JsonPath.stringAt("$"),
        token: sfn.JsonPath.taskToken,
        stateName: sfn.JsonPath.stringAt("$$.State.Name")
      })
    })
  ).next(
    new tasks.LambdaInvoke(stack, "OnTheWay", {
      lambdaFunction: orderPlacedFn,
      resultPath: "$",
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      // payloadResponseOnly: true,
      retryOnServiceExceptions: true,
      payload: sfn.TaskInput.fromObject({
        body: sfn.JsonPath.stringAt("$"),
        token: sfn.JsonPath.taskToken,
        stateName: sfn.JsonPath.stringAt("$$.State.Name")
      })
    })
  ).next(
    new tasks.LambdaInvoke(stack, "Delivered", {
      lambdaFunction: orderPlacedFn,
      resultPath: "$",
      integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
      // payloadResponseOnly: true,
      retryOnServiceExceptions: true,
      payload: sfn.TaskInput.fromObject({
        body: sfn.JsonPath.stringAt("$"),
        stateName: sfn.JsonPath.stringAt("$$.State.Name")
      })
    })
  );
  const orderProcessStateMachine = new StateMachine(
    stack,
    "OrderTrackingStateMachine",
    {
      definition,
      stateMachineName: "OrderTrackingStateMachine-" + stack.stage
    }
  );
}, "SFStack");

// sst.config.ts
var sst_config_default = {
  config(_input) {
    return {
      name: "promodeagro-admin",
      region: "ap-south-1"
    };
  },
  stacks(app) {
    if (app.stage !== "prod") {
      app.setDefaultRemovalPolicy("destroy");
    }
    app.stack(AuthStack).stack(API).stack(SFStack);
  }
};
export {
  sst_config_default as default
};
