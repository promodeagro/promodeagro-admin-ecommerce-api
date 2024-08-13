require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const orderTable = "Orders";

console.log("orderTab :", orderTable);

module.exports.handler = async (event) => {
	const fallbackValue = 0;
	const [
		totalOrderCount,
		completedOrderCount,
		cancelledOrderCount,
		refundedOrderCount,
	] = await Promise.all([
		totalOrders(),
		orderStatsByStatus("completed").catch(() => fallbackValue),
		orderStatsByStatus("cancelled").catch(() => fallbackValue),
		orderStatsByStatus("refunded").catch(() => fallbackValue),
	]);
	return {
		statusCode: 200,
		body: JSON.stringify({
			totalOrderCount: totalOrderCount,
			completedOrderCount: completedOrderCount,
			confirmedOrderCount: 0, //--TODO--
			cancelledOrderCount: cancelledOrderCount,
			refundedOrderCount: refundedOrderCount,
		}),
	};
};

const totalOrders = async () => {
	let itemCount = 0;
	let lastEvaluatedKey = undefined;

	do {
		const params = {
			TableName: orderTable,
			Select: "COUNT",
			ExclusiveStartKey: lastEvaluatedKey,
		};

		try {
			const command = new ScanCommand(params);
			const data = await docClient.send(command);

			itemCount += data.Count;
			lastEvaluatedKey = data.LastEvaluatedKey;
		} catch (error) {
			console.error("Error scanning table:", error);
			throw error;
		}
	} while (lastEvaluatedKey);

	return itemCount;
};

const orderStatsByStatus = async (status) => {
	let itemCount = 0;
	let lastEvaluatedKey = undefined;

	do {
		const params = {
			TableName: orderTable,
			Select: "COUNT",
			FilterExpression: "#status = :statusValue",
			ExpressionAttributeNames: {
				"#status": "status",
			},
			ExpressionAttributeValues: {
				":statusValue": status,
			},
			ExclusiveStartKey: lastEvaluatedKey,
		};

		try {
			const command = new ScanCommand(params);
			const data = await docClient.send(command);

			itemCount += data.Count;
			lastEvaluatedKey = data.LastEvaluatedKey;
		} catch (error) {
			console.error("Error scanning table:", error);
			throw error;
		}
	} while (lastEvaluatedKey);

	return itemCount;
};
