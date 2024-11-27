import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findById, save, update } from "../../common/data";
import { notification } from "../util/notification";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const usersTable = Table.promodeagroUsers.tableName;
const notificationsTable = Table.notificationsTable.tableName;

export const listRiders = async (status, nextKey) => {
	const params = {
		TableName: usersTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
		FilterExpression: "#rs = :reviewStatusVal AND #role = :riderRole",
		ExpressionAttributeNames: { "#rs": "reviewStatus", "#role": "role" },
	};
	if (status != undefined) {
		params.ExpressionAttributeValues = {
			":reviewStatusVal": status,
			":riderRole": "rider",
		};
	} else {
		params.FilterExpression =
			"#rs IN (:pending, :active, :rejected) AND #role = :riderRole";
		params.ExpressionAttributeValues = {
			":pending": "pending",
			":active": "active",
			":rejected": "rejected",
			":riderRole": "rider",
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

export const searchListRiders = async (query) => {
	let nextKey;
	const params = {
		TableName: usersTable,
		FilterExpression: "contains(#s_name, :query) AND #role = :riderRole",
		ExpressionAttributeNames: {
			"#s_name": "s_name",
			"#role": "role",
		},
		ExpressionAttributeValues: {
			":query": query,
			":riderRole": "rider",
		},
	};

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
		s_name: undefined,
	}));
	return {
		count: data.Count,
		items: modData,
		nextKey: nextKey,
	};
};

export const getRider = async (id) => {
	const rider = await findById(usersTable, id);
	return rider;
};

export const activateRider = async (id, { status, reason }) => {
	const newNot = notification(
		id,
		"rider_profile_activated",
		"You profile has been activated"
	);

	await save(notificationsTable, newNot);
	return await update(
		usersTable,
		{ id: id },
		{
			reviewStatus: status,
			rejectionReason: reason ?? null,
		}
	);
};

export const rejectRider = async (id, { status, reason }) => {
	const rider = await findById(usersTable, id);
	if (!rider) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "rider not found" }),
		};
	}
	const newNot = notification(
		id,
		"rider_profile_rejected",
		`You profile has been rejected for following reason ${reason}`
	);

	await save(notificationsTable, newNot);

	return await update(
		usersTable,
		{ id: id },
		{ reviewStatus: status, rejectionReason: reason }
	);
};

export const verifyDocument = async (id, { status, document, reason }) => {
	const rider = await findById(usersTable, id);
	if (!rider) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "rider not found" }),
		};
	}
	let type;
	let message;

	if (document === "bankDetails") {
		rider.bankDetails.status = status;
		if (status === "verified") {
			rider.profileStatus.bankDetailsCompleted = true;
			rider.bankDetails.reason = null;
		}
		if (status === "rejected") {
			rider.bankDetails.reason = reason;
			type = "document_rejected";
			message = `Your bank details has been rejected for the following reason ${reason}`;
		}
		const newNot = notification(id, type, message);
		await save(notificationsTable, newNot);
		return await update(
			usersTable,
			{ id: id },
			{
				bankDetails: rider.bankDetails,
				profileStatus: rider.profileStatus,
			}
		);
	}
	const documents = rider.documents;
	const a = documents.filter((item) => item.name === document);
	if (status === "verified") {
		a[0].verified = status;
	}
	if (status === "rejected") {
		a[0].verified = status;
		a[0].rejectionReason = reason;
		type = "document_rejected";
		message = `Your ${document} has been rejected for the following reason ${reason}`;
	}
	const newNot = notification(id, type, message);
	await save(notificationsTable, newNot);
	return await update(usersTable, { id: id }, { documents: documents });
};
