import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// Helper function to calculate date ranges
const calculateDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(23, 59, 59, 999);
  return {
    startOfDayISO: startDate.toISOString(),
    endOfDayISO: endDate.toISOString(),
  };
};

// Helper function to get orders older than a certain number of days
const calculateOldOrdersRange = (days) => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - days);
  oldDate.setUTCHours(0, 0, 0, 0);
  return {
    startOfDayISO: "1970-01-01T00:00:00.000Z",
    endOfDayISO: oldDate.toISOString(),
  };
};

const getAddressArea = async (userId, addressId) => {
  const addressParams = {
    TableName: process.env.ADDRESSES_TABLE || "Addresses",
    Key: {
      userId,
      addressId,
    },
  };

  try {
    const addressData = await docClient.send(new GetCommand(addressParams));
    if (addressData.Item && addressData.Item.area) {
      return addressData.Item.area;
    } else {
      console.log(`Area not found for addressId: ${addressId}`);
      return "no data available";
    }
  } catch (error) {
    console.error(`Error fetching address for addressId ${addressId}:`, error);
    return "Error fetching area";
  }
};

// Main handler function for processing orders
export const handler = middy(async (event) => {
  const queryParams = event.queryStringParameters || {};
  if (!queryParams.filter) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing 'filter' query parameter",
      }),
    };
  }

  let startOfDayISO, endOfDayISO;
  if (queryParams.filter === "7 days old") {
    ({ startOfDayISO, endOfDayISO } = calculateDateRange(7));
  } else if (queryParams.filter === "14 Days old") {
    ({ startOfDayISO, endOfDayISO } = calculateDateRange(14));
  } else if (queryParams.filter === "1 month old") {
    ({ startOfDayISO, endOfDayISO } = calculateDateRange(30));
  } else if (queryParams.filter === "2 months old") {
    ({ startOfDayISO, endOfDayISO } = calculateDateRange(60));
  } else if (queryParams.filter === "old orders") {
    ({ startOfDayISO, endOfDayISO } = calculateOldOrdersRange(60));
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `Invalid filter value: '${queryParams.filter}'. Please use a valid filter.`,
      }),
    };
  }

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
  if (!ordersData.Items || ordersData.Items.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `No orders found for the selected date range`,
      }),
    };
  }

  // Fetch area for each order based on addressId
  const formattedOrders = await Promise.all(
    ordersData.Items.map(async (item) => {
      let area = "no data available";
      if (item.address?.addressId && item.address?.userId) {
        area = await getAddressArea(
          item.address.userId,
          item.address.addressId
        );
      }

      return {
        orderId: item.id || "",
        orderDate: item.createdAt || "",
        customerName: item.customerName || "",
        itemsCount: item.items ? item.items.length : 0,
        paymentStatus: item.paymentDetails?.status || "",
        orderStatus: item.status || "",
        totalAmount: item.totalPrice || 0,
        area: area,
      };
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      items: formattedOrders,
    }),
  };
}).use(errorHandler());
