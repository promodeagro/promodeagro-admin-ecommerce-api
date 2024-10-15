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
	const orders = await Promise.all(
		req.orders.map((order) => findById(orderTable, order))
	);
	const amountCollectable = orders
		.filter((item) => (item.paymentDetails.method = "cash"))
		.reduce((acc, order) => acc + parseInt(order.totalPrice), 0);

	const runsheet = {
		id: crypto.randomUUID().split("-")[4],
		...req,
		status: "pending",
		amountCollectable,
	};
	await save(runsheetTable, runsheet);
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
			return {
				...item,
				name: JSON.parse(rider.personalDetails).fullName,
			};
		})
	);
};

export const getRunsheet = async (id) => {
	return await findById(runsheetTable, id);
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
