require("dotenv").config();
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamoClient = new DynamoDBClient();

module.exports.handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		const params = {
			TableName: process.env.ORDER_TABLE,
			Limit: 10,
			ExclusiveStartKey: nextKey
				? {
						id: { S: nextKey },
				  }
				: undefined,
		};
		const command = new ScanCommand(params);
		const data = await dynamoClient.send(command);
		const items = data.Items.map((item) => unmarshall(item));
		const res = items.map((item) => {
			return {
				id: item.id,
				orderDate: item.createdAt,
				customerName: item.address.name,
				items: item.items.length,
				orderStatus: item.status,
				totalAmount: item.totalPrice,
				area: item.address.address,
			};
		});
		nextKey = unmarshall(data.LastEvaluatedKey);
		return {
			statusCode: 200,
			body: JSON.stringify({
				count: data.Count,
				orders: res,
				nextKey: nextKey.id,
			}),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
