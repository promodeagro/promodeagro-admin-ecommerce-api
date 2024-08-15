require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const date = queryParams.date || new Date().toISOString().split("T")[0];
    console.log(date);
    const startDate = queryParams.startDate || date;
    const endDate = queryParams.endDate || date ;

    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const startOfDayISO = startOfDay.toISOString();
    const endOfDayISO = endOfDay.toISOString();

    const timeData = {};
    // Fetch sales data
    const salesParams = {
      TableName: process.env.SALES_TABLE || "sales",
      FilterExpression: "SaleTimestamp BETWEEN :startOfDay AND :endOfDay",
      ExpressionAttributeValues: {
        ":startOfDay": startOfDayISO,
        ":endOfDay": endOfDayISO,
      },
    };
    const salesData = await docClient.send(new ScanCommand(salesParams));
    salesData.Items.forEach((item) => {
      const saleTime = new Date(item.SaleTimestamp);
      const formattedTime = `${saleTime.getUTCHours()}:${saleTime
        .getUTCMinutes()
        .toString()
        .padStart(2, "0")}`;
      if (timeData[formattedTime]) {
        timeData[formattedTime] += item.Price || 0;
      } else {
        timeData[formattedTime] = item.Price || 0;
      }
    });
    // Prepare response in the desired format
    const response = Object.entries(timeData).map(
      ([time, totalSalesPrice]) => ({
        time,
        totalSalesPrice,
      })
    );

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
