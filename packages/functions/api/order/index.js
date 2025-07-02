import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	ScanCommand,
	TransactWriteCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findById, update } from "../../common/data";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTable = Table.OrdersTable.tableName;
const inventoryTable = Table.inventoryTable.tableName;

export const listOrdersInventory = async (
	type,
	date,
	status,
	shift,
	pincode,
	nextKey
) => {
	let now = new Date();
	now.setHours(0, 0, 0, 0);
	let end;
	let dateQuery;

	if (!date) {
		now.setDate(now.getDate() - 7);
		dateQuery = "createdAt > :date";
	} else {
		const dateRanges = {
			"older": () => now.setMonth(now.getMonth() - 3),
			"2m": () => now.setMonth(now.getMonth() - 2),
			"1m": () => now.setMonth(now.getMonth() - 1),
			"14": () => now.setDate(now.getDate() - 14),
			"7": () => now.setDate(now.getDate() - 7),
			"today": () => {},
			"yesterday": () => {
				now.setDate(now.getDate() - 1);
				end = new Date(now);
				end.setDate(end.getDate() + 1);
			},
		};

		if (dateRanges[date]) {
			dateRanges[date]();
			dateQuery = date === "yesterday" ? "createdAt BETWEEN :date AND :end" : "createdAt > :date";
		}
	}

	const params = {
		TableName: orderTable,
		// Limit: 50,
		ExclusiveStartKey: nextKey ? { id: nextKey } : undefined,
		IndexName: status ? "statusCreatedAtIndex" : undefined,
		ScanIndexForward: false,
	};

	const expressionValues = {
		":date": now.toISOString(),
		...(end ? { ":end": end.toISOString() } : {}),
	};
	const expressionNames = {};

	if (status) {
		expressionNames["#s"] = "status";
		expressionValues[":status"] = status;
		params.KeyConditionExpression = "#s = :status AND " + dateQuery;
	}

	const filterExpressions = [];
	if (type) {
		filterExpressions.push("paymentDetails.#m = :method");
		expressionNames["#m"] = "method";
		expressionValues[":method"] = type;
	}
	if (shift) {
		filterExpressions.push("deliverySlot.#sh = :shift");
		expressionNames["#sh"] = "shift";
		expressionValues[":shift"] = shift;
	}
	if (pincode) {
		filterExpressions.push("address.#pn = :zipCode");
		expressionNames["#pn"] = "zipCode";
		expressionValues[":zipCode"] = pincode;
	}

	if (filterExpressions.length > 0) {
		params.FilterExpression = filterExpressions.join(" AND ");
	}

	params.ExpressionAttributeNames = Object.keys(expressionNames).length ? expressionNames : undefined;
	params.ExpressionAttributeValues = expressionValues;

	const command = status ? new QueryCommand(params) : new ScanCommand(params);
	const data = await docClient.send(command);

	return {
		count: data.Count,
		items: data.Items,
		nextKey: data.LastEvaluatedKey ? data.LastEvaluatedKey.id : undefined,
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

export const reAttempt = async (id) => {
	const order = await findById(orderTable, id);

	console.log(order)
	if (order.status !== "cancelled") {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "order is not cancelled" }),
		};
	}
	console.log(order.status)

	const cancellationData = {
		status: "order placed", // Change the status to "order placed"
		cancelledAt: null,      // No cancellation time as the order is being placed again
		cancelReason: null,     // No reason needed as it's not a cancellation anymore
		cancellationBy: null,   // No cancellation by user
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
						":status": "order placed",    // Setting status to "order placed"
						":cancellationData": cancellationData,
					},
				},
			},
		],
	};

	const command = new TransactWriteCommand(input);
	await docClient.send(command);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "order status updated to 'order placed'",
		}),
	};
};


export const assignPacker = async (req) => {
	const time = new Date().toISOString();

	const batchUpdateParams = {
		TransactItems: req.map((order) => ({
			Update: {
				TableName: orderTable,
				Key: { id: order.orderId },
				UpdateExpression:
					"SET #packerId = :packerId, #packedAt = :packedAt, #status = :status",
				ExpressionAttributeNames: {
					"#packerId": "packerId",
					"#packedAt": "packedAt",
					"#status": "status",
				},
				ExpressionAttributeValues: {
					":packerId": order.packerId,
					":packedAt": time,
					":status": "order processing",
				},
			},
		})),
	};
	await docClient.send(new TransactWriteCommand(batchUpdateParams));
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "success",
		}),
	};
};
