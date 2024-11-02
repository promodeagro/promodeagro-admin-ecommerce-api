import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
	QueryCommand,
	DeleteCommand,
	TransactWriteCommand,
	BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findAll, findById, save, update } from "../../common/data";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTable = Table.OrdersTable.tableName;
const runsheetTable = Table.runsheetTable.tableName;
const riderTable = Table.riderTable.tableName;

export const createRunsheet = async (req) => {
	const riderExistsParams = {
		TableName: riderTable,
		Key: {
			id: req.riderId,
		},
		Limit: 1,
	};
	const res = await docClient.send(new GetCommand(riderExistsParams));
	if (!res.Item) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "rider does not exist",
			}),
		};
	}
	const ordersParams = {
		RequestItems: {
			[orderTable]: {
				Keys: req.orders.map((orderId) => ({ id: orderId })),
				ProjectionExpression: "id, paymentDetails, #status, totalPrice",
				ExpressionAttributeNames: {
					"#status": "status",
				},
			},
		},
	};
	const ordersResponse = await docClient.send(
		new BatchGetCommand(ordersParams)
	);
	const orders = ordersResponse.Responses[orderTable];
	const validOrders = orders.filter((item) => item.status === "order placed");
	if (validOrders.length == 0) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message:
					"invalid orders: orders may already be assigneed or completed",
			}),
		};
	}
	const amountCollectable = validOrders
		.filter((item) => item.paymentDetails.method === "cash")
		.reduce((acc, order) => acc + parseInt(order.totalPrice), 0);
	const runsheet = {
		id: crypto.randomUUID().split("-")[4],
		orders: validOrders.map((order) => order.id),
		status: "pending",
		amountCollectable,
		riderId: req.riderId,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	const transactItems = [
		{
			Put: {
				TableName: runsheetTable,
				Item: runsheet,
			},
		},
		...validOrders.map((order) => ({
			Update: {
				TableName: orderTable,
				Key: { id: order.id },
				UpdateExpression: "SET #status = :newStatus",
				ExpressionAttributeNames: { "#status": "status" },
				ExpressionAttributeValues: { ":newStatus": "on the way" },
			},
		})),
	];
	await docClient.send(
		new TransactWriteCommand({ TransactItems: transactItems })
	);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "created runsheet successfully" }),
	};
};

export const runsheetList = async (nextKey) => {
	const list = await findAll(runsheetTable, nextKey);
	return await Promise.all(
		list.items.map(async (item) => {
			const rider = await findById(riderTable, item.riderId);
			const riderDetails = {
				id: item.riderId,
				name: rider.personalDetails.fullName,
				number: rider.number,
			};
			delete item.riderId;
			return {
				...item,
				rider: riderDetails,
			};
		})
	);
};

export const getRunsheet = async (id) => {
	const runsheet = await findById(runsheetTable, id);
	const params = {
		TableName: riderTable,
		Key: {
			id: runsheet.riderId,
		},
		ProjectionExpression: "#pd.#fn",
		ExpressionAttributeNames: {
			"#pd": "personalDetails",
			"#fn": "fullName",
		},
	};
	const rider = await docClient.send(new GetCommand(params));
	const riderDetails = {
		id: runsheet.riderId,
		name: rider.Item.personalDetails.fullName,
	};
	delete runsheet.riderId;
	return { ...runsheet, rider: riderDetails };
};

export const closeRunsheet = async (id, amount) => {
	const runsheetExistsParams = {
		TableName: runsheetTable,
		Key: {
			id: id,
		},
		Limit: 1,
	};
	const res = await docClient.send(new GetCommand(runsheetExistsParams));
	if (!res.Item) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "runsheet does not exist",
			}),
		};
	}
	return await update(
		runsheetTable,
		{
			id: id,
		},
		{ amountCollected: amount, status: "closed" }
	);
};

export const runsheetSearch = async (query) => {
	const idParams = {
		TableName: runsheetTable,
		FilterExpression: "contains(#id, :query)",
		ExpressionAttributeNames: {
			"#id": "id",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};
	const idData = await docClient.send(new ScanCommand(idParams));
	if (idData.Items.length == 0) {
		const params = {
			TableName: riderTable,
			FilterExpression: "contains(personalDetails.#fullName, :query)",
			ExpressionAttributeNames: {
				"#fullName": "fullName",
			},
			ExpressionAttributeValues: {
				":query": query,
			},
		};
		const command = new ScanCommand(params);
		const data = await docClient.send(command);
		const riderData = await Promise.all(
			data.Items.map((rider) => {
				const params = {
					TableName: runsheetTable,
					IndexName: "riderIndex",
					KeyConditionExpression: "riderId = :riderId",
					ExpressionAttributeValues: {
						":riderId": rider.id,
					},
				};
				const runsheetCommand = new QueryCommand(params);
				return client.send(runsheetCommand);
			})
		);
		const arr = riderData.flatMap((item) => item.Items);
		return await Promise.all(
			arr.map(async (item) => {
				const rider = await findById(riderTable, item.riderId);
				const riderDetails = {
					id: item.riderId,
					name: rider.personalDetails.fullName,
					number: rider.number,
				};
				delete item.riderId;
				return {
					...item,
					rider: riderDetails,
				};
			})
		);
	}
	return await Promise.all(
		idData.Items.map(async (item) => {
			const rider = await findById(riderTable, item.riderId);
			const riderDetails = {
				id: item.riderId,
				name: rider.personalDetails.fullName,
				number: rider.number,
			};
			delete item.riderId;
			return {
				...item,
				rider: riderDetails,
			};
		})
	);
};

export const cashCollectionList = async (status, date, nextKey) => {
	let startISO, endISO;
	if (date) {
		const startOfDay = new Date(date);
		startOfDay.setUTCHours(0, 0, 0, 0);
		startISO = startOfDay.toISOString();

		const endOfDay = new Date(date);
		endOfDay.setUTCHours(23, 59, 59, 999);
		endISO = endOfDay.toISOString();
	}
	const params = {
		TableName: runsheetTable,
		IndexName: "statusCreatedAtIndex",
		KeyConditionExpression: "#st = :status",
		ExpressionAttributeNames: {
			"#st": "status",
		},
		ExpressionAttributeValues: {
			":status": status,
		},
		ScanIndexForward: false,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
	};
	if (date) {
		params.KeyConditionExpression +=
			" AND #createdAt BETWEEN :startOfDay AND :endOfDay";
		params.ExpressionAttributeNames["#createdAt"] = "createdAt";
		params.ExpressionAttributeNames[":startOfDay"] = startISO;
		params.ExpressionAttributeNames[":endOfDay"] = endISO;
	}
	console.log(JSON.stringify(params, null, 2));
	const res = await docClient.send(new QueryCommand(params));
	return await Promise.all(
		res.Items.map(async (item) => await commonRunsheetFunc(item))
	);
};

export const cashCollectionSearch = async (query) => {
	const idParams = {
		TableName: runsheetTable,
		FilterExpression: "contains(#id, :query)",
		ExpressionAttributeNames: {
			"#id": "id",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};
	const idData = await docClient.send(new ScanCommand(idParams));
	if (idData.Items.length == 0) {
		const params = {
			TableName: riderTable,
			FilterExpression: "contains(personalDetails.#fullName, :query)",
			ExpressionAttributeNames: {
				"#fullName": "fullName",
			},
			ExpressionAttributeValues: {
				":query": query,
			},
		};
		const command = new ScanCommand(params);
		const data = await docClient.send(command);
		const riderData = await Promise.all(
			data.Items.map((rider) => {
				const params = {
					TableName: runsheetTable,
					IndexName: "riderIndex",
					KeyConditionExpression: "riderId = :riderId",
					ExpressionAttributeValues: {
						":riderId": rider.id,
					},
				};
				const runsheetCommand = new QueryCommand(params);
				return client.send(runsheetCommand);
			})
		);
		const arr = riderData.flatMap((item) => item.Items);
		return await Promise.all(
			arr.map(async (item) => await commonRunsheetFunc(item))
		);
	}
	return await Promise.all(
		idData.Items.map(async (item) => await commonRunsheetFunc(item))
	);
};

const commonRunsheetFunc = async (item) => {
	const ordersParams = {
		RequestItems: {
			[orderTable]: {
				Keys: item.orders.map((orderId) => ({ id: orderId })),
				ProjectionExpression: "#status",
				ExpressionAttributeNames: {
					"#status": "status",
				},
			},
		},
	};
	const ordersResponse = await docClient.send(
		new BatchGetCommand(ordersParams)
	);
	const orders = ordersResponse.Responses[orderTable];
	let deliveredCount = 0;
	orders.forEach((item) => {
		if (item.status === "delivered") {
			deliveredCount++;
		}
	});
	const rider = await findById(riderTable, item.riderId);
	const riderDetails = {
		id: item.riderId,
		name: rider.personalDetails.fullName,
		number: rider.number,
	};
	delete item.riderId;
	return {
		...item,
		rider: riderDetails,
		delivered: `${deliveredCount}/${orders.length}`,
	};
};
