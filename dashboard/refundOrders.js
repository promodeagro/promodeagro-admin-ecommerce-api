require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
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

    // Convert dates to ISO strings
    const startOfDayISO = startOfDay.toISOString();
    const endOfDayISO = endOfDay.toISOString();

    // Fetch orders for the specified date range
    const ordersParams = {
      TableName: process.env.ORDERS_TABLE || 'Orders',
      FilterExpression: '#createdAt BETWEEN :startOfDay AND :endOfDay',
      ExpressionAttributeNames: {
        '#createdAt': 'createdAt',
      },
      ExpressionAttributeValues: {
        ':startOfDay': startOfDayISO,
        ':endOfDay': endOfDayISO,
      },
    };

    const ordersData = await docClient.send(new ScanCommand(ordersParams));

    if (ordersData.Items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `No orders found between ${startDate} and ${endDate}` }),
      };
    }

    const formattedOrders = ordersData.Items.map(item => ({
      orderId: item.id || '',
      customerName: item.address.name || '',
      status: item.status || '',
      Reason: item.Reason || '',
      deliveryDetail: item.address.address || '',
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(formattedOrders),
    };
  } catch (error) {
    console.error('Error fetching data from DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch data' }),
    };
  }
};