import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findById, update } from "../../common/data";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const usersTable = Table.promodeagroUsers.tableName;

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
	const rider = await findById(usersTable, id);
	return rider;
};

export const activateRider = async (id, req) => {
	return await update(
		usersTable,
		{ id: id },
		{
			reviewStatus: status,
			rejectionReason: null,
		}
	);
};

export const rejectRider = async (id, req) => {
	const rider = await findById(usersTable, id);
	if (!rider) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "rider not found" }),
		};
	}
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
	if (document === "bankDetails") {
		rider.bankDetails.status = status;
		if (status === "verified") {
			rider.profileStatus.bankDetailsCompleted = true;
			rider.bankDetails.reason = null;
		}
		if (status === "rejected") {
			rider.bankDetails.reason = reason;
		}
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
	console.log(documents);
	console.log(1);
	const a = documents.filter((item) => item.name === document);
	console.log(a);
	console.log(2);
	if (status === "verified") {
		console.log(3);
		a[0].verified = status;
	}
	if (status === "rejected") {
		a[0].verified = status;
		a[0].rejectionReason = reason;
	}
	return await update(usersTable, { id: id }, { documents: documents });
};
