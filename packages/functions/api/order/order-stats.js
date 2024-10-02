import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const orderTable = Table.OrdersTable.tableName;

console.log("orderTab :", orderTable);

export const handler = async (event) => {
	const fallbackValue = 0;
	const [
		totalOrderCount,
		completedOrderCount,
		confirmedOrderCount,
		cancelledOrderCount,
		refundedOrderCount,
	] = await Promise.all([
		totalOrders(),
		orderStatsByStatus("delivered").catch(() => fallbackValue),
		orderStatsByStatus("order placed").catch(() => fallbackValue),
		orderStatsByStatus("cancelled").catch(() => fallbackValue),
		orderStatsByStatus("refunded").catch(() => fallbackValue),
	]);
	return {
		statusCode: 200,
		body: JSON.stringify({
			totalOrderCount: totalOrderCount,
			completedOrderCount: completedOrderCount,
			confirmedOrderCount: confirmedOrderCount,
			cancelledOrderCount: cancelledOrderCount,
			refundedOrderCount: refundedOrderCount,
		}),
	};
};

const totalOrders = async () => {
	//Best approach for table <2.5gb
	const command = new DescribeTableCommand({ TableName: orderTable });
	const response = await docClient.send(command);
	return response.Table.ItemCount;

	//Best approach for any size table
	// let itemCount = 0;
	// let lastEvaluatedKey = undefined;

	// do {
	// 	const params = {
	// 		TableName: orderTable,
	// 		Select: "COUNT",
	// 		ExclusiveStartKey: lastEvaluatedKey,
	// 	};

	// 	try {
	// 		const command = new ScanCommand(params);
	// 		const data = await docClient.send(command);

	// 		itemCount += data.Count;
	// 		lastEvaluatedKey = data.LastEvaluatedKey;
	// 	} catch (error) {
	// 		console.error("Error scanning table:", error);
	// 		throw error;
	// 	}
	// } while (lastEvaluatedKey);

	// return itemCount;
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
