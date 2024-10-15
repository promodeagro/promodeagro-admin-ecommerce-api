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
import { findAll, findById, save } from "../../common/data";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

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
	const runsheet = {
		id: crypto.randomUUID().split("-")[4],
		...req,
		status: "pending",
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
