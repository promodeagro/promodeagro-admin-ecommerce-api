import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Use the correct table name for your environment
const TABLE_NAME = "prod-promodeagro-admin-OrdersTable";

function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

async function updateOrderStatuses() {
  const client = new DynamoDBClient({ region: "ap-south-1" });
  const docClient = DynamoDBDocumentClient.from(client);

  let ExclusiveStartKey = undefined;
  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  do {
    const scanParams = {
      TableName: TABLE_NAME,
      ExclusiveStartKey,
      FilterExpression: "#status = :orderPlaced",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":orderPlaced": "order placed" },
      Limit: 100,
    };
    const data = await docClient.send(new ScanCommand(scanParams));
    totalScanned += data.Items.length;

    for (const order of data.Items) {
      if (isToday(order.createdAt)) {
        totalSkipped++;
        continue;
      }
      // Only update status
      const updateParams = {
        TableName: TABLE_NAME,
        Key: { id: order.id },
        UpdateExpression: "SET #status = :delivered",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":delivered": "delivered" },
        ReturnValues: "UPDATED_NEW",
      };
      try {
        await docClient.send(new UpdateCommand(updateParams));
        totalUpdated++;
        console.log(`Order ${order.id} status updated to delivered.`);
      } catch (err) {
        console.error(`Failed to update order ${order.id}:`, err.message);
      }
    }
    ExclusiveStartKey = data.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log("\nUpdate complete.");
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total skipped (today's orders): ${totalSkipped}`);
}

updateOrderStatuses().catch(console.error); 