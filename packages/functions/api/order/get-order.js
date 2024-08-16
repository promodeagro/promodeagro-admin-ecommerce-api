import { findById } from "../../common/data";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Config } from "sst/node/config";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	try {
		console.log("1");
		const orderData = await findById(Config.ORDER_TABLE, id);
		const params = {
			TableName: Config.USERS_TABLE,
			Key: {
				UserId: orderData.userId,
			},
		};
		const userRes = await docClient.send(new GetCommand(params));
		const userData = userRes.Item;
		const response = {
			orderId: orderData.id,
			status: orderData.status,
			deliverySlot: orderData.deliverySlot,
			userInfo: {
				number: userData?.MobileNumber || undefined,
				name: userData?.Name || undefined,
			},
			paymentDetails: orderData.paymentDetails,
			shippingDetails: {
				address: orderData.address.address,
				zipcode: orderData.address.zipCode,
			},
			items: orderData.items,
			createdAt: orderData.createdAt,
		};
		return {
			statusCode: 200,
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
