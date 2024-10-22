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

export const listOrdersInventory = async (type, date, nextKey) => {
	let dateQuery;
	let now = new Date();
	let d = date;
	if (d == undefined) {
		now.setDate(now.getDate() - 7);
		dateQuery = `createdAt > :date`;
	} else if (d == "older") {
		now.setMonth(now.getMonth() - 3);
		dateQuery = `createdAt < :date`;
	} else if (d == "2m") {
		now.setMonth(now.getMonth() - 2);
		dateQuery = `createdAt > :date`;
	} else if (d == "1m") {
		now.setMonth(now.getMonth() - 1);
		dateQuery = `createdAt > :date`;
	} else if (d == "14") {
		now.setDate(now.getDate() - 14);
		dateQuery = `createdAt > :date`;
	} else if (d == "7") {
		now.setDate(now.getDate() - 7);
		dateQuery = `createdAt > :date`;
	}

	console.log("dateQuery ", dateQuery);
	const params = {
		TableName: orderTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
		IndexName: "statusCreatedAtIndex",
		ScanIndexForward: false,
		FilterExpression: dateQuery ? `${dateQuery}` : undefined, // Handle dateQuery properly
		ExpressionAttributeValues: {
			":date": now.toISOString(),
		},
	};
	console.log(params);
	if (type) {
		params.FilterExpression = params.FilterExpression
			? `${params.FilterExpression} AND paymentDetails.#m = :method`
			: "paymentDetails.#m = :method";

		params.ExpressionAttributeNames = {
			...(params.ExpressionAttributeNames || {}), // Merge with existing, if any
			"#m": "method",
		};

		params.ExpressionAttributeValues = {
			...(params.ExpressionAttributeValues || {}), // Merge with existing, if any
			":method": type,
		};
	}
	console.log(params);
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
