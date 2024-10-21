import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	ScanCommand,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findById, update } from "../../common/data";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTable = Table.OrdersTable.tableName;
const inventoryTable = Table.inventoryTable.tableName;

export const listOrdersInventory = async (type, nextKey) => {
	const params = {
		TableName: orderTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
	};
	if (type) {
		(params.FilterExpression = "paymentDetails.#m = :method"),
			(params.ExpressionAttributeNames = {
				"#m": "method",
			}),
			(params.ExpressionAttributeValues = {
				":method": type,
			});
	}
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	if (data.LastEvaluatedKey) {
		nextKey = data.LastEvaluatedKey.id;
	} else {
		nextKey = undefined;
	}
	return {
		count: data.Count,
		items: data.Items,
		nextKey: nextKey,
	};
};

export const cancelOrder = async (id, reason) => {
	const order = await findById(orderTable, id);
	if (order.status == "cancelled") {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "order already cancelled" }),
		};
	}
	const cancellationData = {
		status: "cancelled",
		cancelledAt: new Date().toISOString(),
		cancelReason: reason,
		cancellationBy: "admin",
	};
	const input = {
		TransactItems: [
			{
				Update: {
					TableName: orderTable,
					Key: { id },
					UpdateExpression:
						"SET #status = :status, #cancellationData = :cancellationData",
					ExpressionAttributeNames: {
						"#status": "status",
						"#cancellationData": "cancellationData",
					},
					ExpressionAttributeValues: {
						":status": "cancelled",
						":cancellationData": cancellationData,
					},
				},
			},
			...order.items.map((item) => ({
				Update: {
					TableName: inventoryTable,
					Key: { id: item.productId },
					UpdateExpression: "ADD stockQuantity :quantity",
					ExpressionAttributeValues: {
						":quantity": item.quantity,
					},
				},
			})),
		],
	};
	const command = new TransactWriteCommand(input);
	await docClient.send(command);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "order cancelled",
		}),
	};
};
