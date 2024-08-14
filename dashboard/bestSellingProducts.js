require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const date = queryParams.date || new Date().toISOString().split("T")[0];
    const startDate = queryParams.startDate || date;
    const endDate = queryParams.endDate || date;

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Convert dates to ISO strings
    const startOfDayISO = startOfDay.toISOString();
    const endOfDayISO = endOfDay.toISOString();

    const productsParams = {
      TableName: process.env.PRODUCT_TABLE || "Products",
      FilterExpression: "#createdAt BETWEEN :startOfDay AND :endOfDay",
      ExpressionAttributeNames: {
        "#createdAt": "createdAt",
      },
      ExpressionAttributeValues: {
        ":startOfDay": startOfDayISO,
        ":endOfDay": endOfDayISO,
      },
    };

    const productsData = await docClient.send(new ScanCommand(productsParams));

    if (productsData.Items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `No products found between ${startDate} and ${endDate}`,
        }),
      };
    }

    const inventoryParams = {
      TableName: process.env.INVENTORY_TABLE || "Inventory",
      FilterExpression: "#createdAt BETWEEN :startOfDay AND :endOfDay",
      ExpressionAttributeNames: {
        "#createdAt": "createdAt",
      },
      ExpressionAttributeValues: {
        ":startOfDay": startOfDayISO,
        ":endOfDay": endOfDayISO,
      },
    };

    const inventoryData = await docClient.send(
      new ScanCommand(inventoryParams)
    );

    if (inventoryData.Items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `No inventory data found between ${startDate} and ${endDate}`,
        }),
      };
    }

    const orderParams = {
      TableName: process.env.ORDERS_TABLE || "Orders",
      FilterExpression: "#createdAt BETWEEN :startOfDay AND :endOfDay",
      ExpressionAttributeNames: {
        "#createdAt": "createdAt",
      },
      ExpressionAttributeValues: {
        ":startOfDay": startOfDayISO,
        ":endOfDay": endOfDayISO,
      },
    };

    const ordersData = await docClient.send(new ScanCommand(orderParams));

    if (ordersData.Items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `No orders found between ${startDate} and ${endDate}`,
        }),
      };
    }
    const inventoryMap = new Map(
      inventoryData.Items.map((item) => [item.productId, item])
    );

    // Combine data from Products and Inventory
    const combinedData = productsData.Items.map((product) => {
      const inventoryItem = inventoryMap.get(product.id) || {};
      return {
        productId: product.id || "",
        productName: product.name || "",
        price: product.price || "",
        unit: product.unit || "",
        orders:
          ordersData.Items.filter((order) => order.productId === product.id)
            .length || 0,
        stock: inventoryItem.stockQuantity || "",
        unit: inventoryItem.unit || "",
        // orders: ordersData.Items.filter(order => order.productId === product.id).length || 0,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(combinedData),
    };
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch data" }),
    };
  }
};
