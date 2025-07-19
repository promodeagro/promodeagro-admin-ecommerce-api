import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
		id: item.id, // Use full id
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
		id: item.id, // Use full id
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
	if (rider) {
		return {
			...rider,
			id: rider.id, // Use full id
		};
	}
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
			message = `${document} has been rejected for the following reason ${reason}`;
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
		message = `${document} has been rejected for the following reason ${reason}`;
	}
	const newNot = notification(id, type, message);
	await save(notificationsTable, newNot);
	return await update(usersTable, { id: id }, { documents: documents });
};

// Rider Summary API
const orderTable = Table.OrdersTable.tableName;
const runsheetTable = Table.runsheetTable.tableName;

export const getRiderSummary = async () => {
    // 1. Get all riders
    const params = {
        TableName: usersTable,
        FilterExpression: "#role = :riderRole",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":riderRole": "rider" },
    };
    const data = await docClient.send(new ScanCommand(params));
    const riders = data.Items || [];

    // 2. For each rider, aggregate summary
    const summary = await Promise.all(riders.map(async (rider) => {
        const riderId = rider.id;
        // Open Runsheets
        const runsheetParams = {
            TableName: runsheetTable,
            IndexName: "riderIndex",
            KeyConditionExpression: "riderId = :riderId",
            ExpressionAttributeValues: { ":riderId": riderId },
        };
        let openRunsheets = 0;
        try {
            const runsheetData = await docClient.send(new QueryCommand(runsheetParams));
            openRunsheets = (runsheetData.Items || []).filter(r => r.status !== "closed").length;
        } catch (e) { openRunsheets = 0; }

        // OFD Orders (status: 'on the way')
        const ofdParams = {
            TableName: orderTable,
            IndexName: "statusCreatedAtIndex",
            KeyConditionExpression: "#s = :status",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":status": "on the way" },
        };
        let ofdOrders = 0;
        let deliveredOrders = 0;
        try {
            const ofdData = await docClient.send(new QueryCommand(ofdParams));
            const ofdItems = (ofdData.Items || []).filter(o => o.riderId === riderId);
            ofdOrders = ofdItems.length;
        } catch (e) { ofdOrders = 0; }

        // Delivered Orders
        const deliveredParams = {
            TableName: orderTable,
            IndexName: "statusCreatedAtIndex",
            KeyConditionExpression: "#s = :status",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":status": "delivered" },
        };
        try {
            const deliveredData = await docClient.send(new QueryCommand(deliveredParams));
            const deliveredItems = (deliveredData.Items || []).filter(o => o.riderId === riderId);
            deliveredOrders = deliveredItems.length;
        } catch (e) { deliveredOrders = 0; }

        // Conversion Ratio
        let conversionRatio = 0;
        if (ofdOrders > 0) {
            conversionRatio = Math.round((deliveredOrders / ofdOrders) * 100);
        }

        return {
            riderId: riderId, // Use full riderId
            name: rider.personalDetails?.fullName || rider.s_name || '',
            email: rider.personalDetails?.email || rider.email || '',
            number: rider.number || '',
            openRunsheets: openRunsheets,
            ofdOrders: ofdOrders,
            deliveries: `${deliveredOrders}/${ofdOrders}`,
            conversionRatio: `${conversionRatio}%`,
        };
    }));

    return {
        count: summary.length,
        items: summary,
    };
};
