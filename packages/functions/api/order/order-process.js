import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

import { update } from "../../common/data";
import { Config } from "sst/node/config";

async function updateOrderStatusAndToken(orderId, newStatus, newToken) {
	const updateParams = {
		TableName: "Orders",
		Key: {
			id: orderId,
		},
		UpdateExpression: "SET #status = :status, #taskToken = :taskToken",
		ExpressionAttributeNames: {
			"#status": "status",
			"#taskToken": "taskToken",
		},
		ExpressionAttributeValues: {
			":status": newStatus,
			":taskToken": newToken,
		},
		ReturnValues: "ALL_NEW",
	};
	try {
		const result = update(
			Config.ORDER_TABLE,
			{
				id: orderId,
			},
			{
				status: newStatus,
				taskToken: newToken,
			}
		);
		// const result = await docClient.send(new UpdateCommand(updateParams));
		return result;
	} catch (error) {
		console.error("Error updating order:", error);
		return null;
	}
}

export const handler = async (event) => {
	// const body = JSON.parse(event);
	const id = event.body.id;
	const state = event.stateName;
	let orderStatus;
	if (state === "OrderPlaced") {
		orderStatus = "order placed";
		// } else if (state === "InProcess") {
		// 	orderStatus = "in process";
	} else if (state === "Packed") {
		orderStatus = "packed";
	} else if (state === "OnTheWay") {
		orderStatus = "on the way";
	} else if (state === "Delivered") {
		orderStatus = "delivered";
	}
	try {
		const updatedOrder = await updateOrderStatusAndToken(
			id,
			orderStatus,
			event.token
		);
	} catch (e) {
		console.log(e.message);
	}

	return event.body;
};
