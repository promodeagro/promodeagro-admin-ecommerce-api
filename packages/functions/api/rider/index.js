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

const riderTable = Table.riderTable.tableName;

export const listRiders = async (status, nextKey) => {
	const params = {
		TableName: riderTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
		FilterExpression: "#rs = :reviewStatusVal",
		ExpressionAttributeNames: { "#rs": "reviewStatus" },
	};
	if (status) {
		params.ExpressionAttributeValues = { ":reviewStatusVal": status };
	} else {
		params.ExpressionAttributeValues = { ":reviewStatusVal": "active" };
	}
	console.log(params);
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	if (data.LastEvaluatedKey) {
		nextKey = data.LastEvaluatedKey.id;
	} else {
		nextKey = undefined;
	}

	const modData = data.Items.map((item) => ({
		...item,
		bankDetails: undefined,
		documents: undefined,
		otpExpire: undefined,
		accountVerified: undefined,
		otp: undefined,
	}));
	return {
		count: data.Count,
		items: modData,
		nextKey: nextKey,
	};
};

export const getRider = async (id) => {
	const rider = await findById(riderTable, id);
	delete rider.otp;
	delete rider.otpExpire;
	return rider;
};

export const activateRider = async (id) => {
	return await update(
		riderTable,
		{ id: id },
		{
			reviewStatus: "active",
		}
	);
};

export const verifyDocument = async (id, document) => {
	const rider = await findById(riderTable, id);
	const documents = JSON.parse(rider.documents);
	console.log(documents);
	const a = documents.filter((item) => item.hasOwnProperty(document));
	a[0].verified = true;
	return await update(
		riderTable,
		{ id: id },
		{ documents: JSON.stringify(documents) }
	);
};
