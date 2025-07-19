import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { Table } from "sst/node/table";

export const handler = middy(async (event) => {
  try {
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "groupId is required" })
      };
    }

    // Fetch all items with the groupId
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
    const client = new DynamoDBClient({ region: "ap-south-1" });
    const docClient = DynamoDBDocumentClient.from(client);
    const productsTable = Table.productsTable.tableName;

    const scanParams = {
      TableName: productsTable,
      FilterExpression: "groupId = :groupId",
      ExpressionAttributeValues: { ":groupId": groupId }
    };
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const items = scanResult.Items || [];
    if (items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No items found for groupId" })
      };
    }

    // Batch delete (max 25 per batch)
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      batches.push(items.slice(i, i + 25));
    }
    for (const batch of batches) {
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: { id: item.id }
        }
      }));
      const batchParams = {
        RequestItems: {
          [productsTable]: deleteRequests
        }
      };
      await docClient.send(new BatchWriteCommand(batchParams));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All items in group deleted successfully",
        deletedIds: items.map(item => item.id),
        groupId
      })
    };
  } catch (error) {
    console.error("Error deleting group:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
}).use(errorHandler()); 