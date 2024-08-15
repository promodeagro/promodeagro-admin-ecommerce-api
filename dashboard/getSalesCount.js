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
    const date = queryParams.date || new Date().toISOString().split('T')[0];
    const startDate = queryParams.startDate || date;
    const endDate = queryParams.endDate || date;

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

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
    const totalPurchase = productsData.Items.reduce((sum, item) => {
      return sum + (item.purchasingPrice || 0);
    }, 0);

    // Fetch today's sales data
    const salesParams = {
      TableName: process.env.SALES_TABLE || "sales",
      FilterExpression: "begins_with(SaleTimestamp, :today)",
      ExpressionAttributeValues: {
        ":today": today,
      },
    };
    const salesData = await docClient.send(new ScanCommand(salesParams));
    const totalSales = salesData.Count;

    // Fetch today's orders data with statuses
    const ordersParams = {
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
    const ordersData = await docClient.send(new ScanCommand(ordersParams));
    const totalOrders = ordersData.Items.length;
    const totalCanceled = ordersData.Items.filter(
      (item) => item.status === "Order Canceled"
    ).length;
    const totalRefunded = ordersData.Items.filter(
      (item) => item.status === "Order Refunded"
    ).length;

    const response = {
      todaySales: totalSales,
      todayProcurement: totalPurchase,
      todayOrders: totalOrders,
      orderCanceled: totalCanceled,
      orderRefunded: totalRefunded,
      // bestSellingProduct: '',
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error fetching data from DynamoDB:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch data" }),
    };
  }
};
