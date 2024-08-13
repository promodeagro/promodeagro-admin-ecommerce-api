require("dotenv").config();
const { findById } = require("../common/data");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	try {
		const orderData = await findById("Orders", id);
		const params = {
			TableName: "Users",
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
				number: userData.MobileNumber,
				name: userData.Name,
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
