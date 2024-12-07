import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	BatchGetCommand,
	DynamoDBDocumentClient,
	GetCommand,
	QueryCommand,
	ScanCommand,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { Table } from "sst/node/table";
import { findAll, findById, update } from "../../common/data";
import { notification } from "../util/notification";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTable = Table.OrdersTable.tableName;
const runsheetTable = Table.runsheetTable.tableName;
const usersTable = Table.promodeagroUsers.tableName;
const notificationsTable = Table.notificationsTable.tableName;

export const createRunsheet = async (req) => {
	const riderExistsParams = {
		TableName: usersTable,
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
	const validOrders = orders.filter(
		(item) => item.status === "packed" || item.status === "undelivered"
	);
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
	const newDate = new Date().toISOString();
	const runsheetId = crypto.randomUUID().split("-")[4];
	const runsheet = {
		id: runsheetId,
		orders: validOrders.map((order) => order.id),
		status: "pending",
		amountCollectable,
		riderId: req.riderId,
		createdAt: newDate,
		updatedAt: newDate,
	};
	const newNot = notification(
		req.riderId,
		"new_runsheet",
		runsheetId.toString()
	);
	const transactItems = [
		{
			Put: {
				TableName: runsheetTable,
				Item: runsheet,
			},
		},
		{
			Put: {
				TableName: notificationsTable,
				Item: newNot,
			},
		},
		...validOrders.map((order) => ({
			Update: {
				TableName: orderTable,
				Key: { id: order.id },
				UpdateExpression:
					"SET #status = :newStatus, #riderId = :riderId",
				ExpressionAttributeNames: {
					"#status": "status",
					"#riderId": "riderId",
				},
				ExpressionAttributeValues: {
					":newStatus": "on the way",
					":riderId": req.riderId,
				},
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
			if (item.riderId) {
				const rider = await findById(usersTable, item.riderId);
				const riderDetails = {};
				if (rider) {
					riderDetails.id = item.riderId;
					riderDetails.name = rider.personalDetails.fullName;
					riderDetails.number = rider.number;
				}
				delete item.riderId;
				return {
					...item,
					rider: riderDetails,
				};
			} else {
				return {
					...item,
				};
			}
		})
	);
};

export const getRunsheet = async (id) => {
	const runsheet = await findById(runsheetTable, id);

	const params = {
		RequestItems: {
			[orderTable]: {
				Keys: runsheet.orders.map((orderId) => ({ id: orderId })),
				ProjectionExpression:
					"totalPrice, paymentDetails, #s, tax, createdAt, #it, totalSavings, statusDetails, deliveryCharges, subTotal, deliverySlot",
				ExpressionAttributeNames: {
					"#s": "status",
					"#it": "items",
				},
			},
			[usersTable]: {
				Keys: [{ id: runsheet.riderId }],
				ProjectionExpression: "personalDetails.fullName",
			},
		},
	};
	const bacthRes = await docClient.send(new BatchGetCommand(params));
	const orders = bacthRes.Responses[orderTable];
	const rider = bacthRes.Responses[usersTable];
	const riderDetails = {
		id: runsheet.riderId,
		name: rider[0].personalDetails.fullName,
	};
	runsheet.orders = orders;
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
			TableName: usersTable,
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
				const rider = await findById(usersTable, item.riderId);
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
			const rider = await findById(usersTable, item.riderId);
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
		params.ExpressionAttributeValues[":startOfDay"] = startISO;
		params.ExpressionAttributeValues[":endOfDay"] = endISO;
	}
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
			TableName: usersTable,
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
	const rider = await findById(usersTable, item.riderId);
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
