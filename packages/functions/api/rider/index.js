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
	if (status != undefined) {
		params.ExpressionAttributeValues = { ":reviewStatusVal": status };
	} else {
		params.FilterExpression = "#rs IN (:pending, :active, :rejected)";
		params.ExpressionAttributeValues = {
			":pending": "pending",
			":active": "active",
			":rejected": "rejected",
		};
	}
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

export const activateRider = async (id, req) => {
	return await update(
		riderTable,
		{ id: id },
		{
			reviewStatus: req.status,
			rejectionReason: null,
		}
	);
};

export const rejectRider = async (id, req) => {
	const rider = await findById(riderTable, id);
	if (!rider) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "rider not found" }),
		};
	}
	return await update(
		riderTable,
		{ id: id },
		{ reviewStatus: req.status, rejectionReason: req.reason }
	);
};

export const verifyDocument = async (id, document, req) => {
	const rider = await findById(riderTable, id);
	if (!rider) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "rider not found" }),
		};
	}
	if (document === "bankDetails") {
		rider.bankDetails.status = req.status;
		if (req.status === "verified") {
			rider.profileStatus.bankDetailsCompleted = true;
			rider.bankDetails.reason = null;
		}
		if (req.status === "rejected") {
			rider.bankDetails.reason = req.reason;
		}
		return await update(
			riderTable,
			{ id: id },
			{
				bankDetails: rider.bankDetails,
				profileStatus: rider.profileStatus,
			}
		);
	}
	const documents = rider.documents;
	const a = documents.filter((item) => item.name === document);
	if (req.status === "verified") {
		a[0].verified = req.status;
	}
	if (req.status === "rejected") {
		a[0].verified = req.status;
		a[0].rejectionReason = req.reason;
	}
	return await update(riderTable, { id: id }, { documents: documents });
};
