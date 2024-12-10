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
	let dateQuery;
	let now = new Date();
	now.setHours(0, 0, 0, 0);
	let end;
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
	} else if (d == "today") {
		dateQuery = `createdAt > :date`;
	} else if (d == "yesterday") {
		now.setDate(now.getDate() - 1);
		end = new Date(now);
		end.setDate(end.getDate() + 1);
		dateQuery = `createdAt > :date AND createdAt < :end`;
	}

	const params = {
		TableName: orderTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: nextKey,
			  }
			: undefined,
		IndexName: nextKey ? undefined : "statusCreatedAtIndex",
		ScanIndexForward: false,
	};

	let expressionValues = {
		":date": now.toISOString(),
		...(d === "yesterday" && end ? { ":end": end.toISOString() } : {}),
	};
	let expressionNames = {};
	let command;

	if (status) {
		params.IndexName = "statusCreatedAtIndex";
		params.KeyConditionExpression = "#s = :status AND " + dateQuery;
		expressionNames["#s"] = "status";
		expressionValues[":status"] = status;
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
	} else {
		params.FilterExpression = dateQuery;
		if (type) {
			params.FilterExpression += " AND paymentDetails.#m = :method";
			expressionNames["#m"] = "method";
			expressionValues[":method"] = type;
		}
		if (shift) {
			params.FilterExpression += " AND deliverySlot.#sh = :shift";
			expressionNames["#sh"] = "shift";
			expressionValues[":shift"] = shift;
		}
		if (pincode) {
			params.FilterExpression += " AND address.#pn = :zipCode";
			expressionNames["#pn"] = "zipCode";
			expressionValues[":zipCode"] = pincode;
		}
	}

	params.ExpressionAttributeNames =
		Object.keys(expressionNames).length > 0 ? expressionNames : undefined;
	params.ExpressionAttributeValues = expressionValues;
	command = status ? new QueryCommand(params) : new ScanCommand(params);

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
