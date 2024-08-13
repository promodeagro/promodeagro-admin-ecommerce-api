require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's sales data
    const salesParams = {
      TableName: process.env.SALES_TABLE || 'sales',
      FilterExpression: 'begins_with(SaleTimestamp, :today)',
      ExpressionAttributeValues: {
        ':today': today,
      },
    };
    const salesData = await docClient.send(new ScanCommand(salesParams));
    const totalSales = salesData.Count;

    // Fetch today's orders data with statuses
    const ordersParams = {
      TableName: process.env.ORDERS_TABLE || 'Orders',
      FilterExpression: '#status IN (:canceled, :refunded) AND begins_with(createdAt, :today)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':canceled': 'Order Canceled',
        ':refunded': 'Order Refunded',
        ':today': today,
      },
    };

    const ordersData = await docClient.send(new ScanCommand(ordersParams));
    const totalOrders = ordersData.Count;
    const totalCanceled = ordersData.Items.filter(item => item.status === 'Order Canceled').length;
    const totalRefunded = ordersData.Items.filter(item => item.status === 'Order Refunded').length;

    // Create the response data
    const response = {
        todaySales: totalSales,
        todayProcurement: '',
        todayOrders: totalOrders,
        orderCanceled: totalCanceled,
        orderRefunded: totalRefunded,
        bestSellingProduct: '', 
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching data from DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch data' }),
    };
  }
};
