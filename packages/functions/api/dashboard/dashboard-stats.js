import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
	const fallbackValue = 0;
	const [totalProductsCount, activeProducts, inactiveProducts] =
		await Promise.all([
			totalProducts(),
			getActiveProducts(true).catch(() => fallbackValue),
			getActiveProducts(false).catch(() => fallbackValue),
		]);

	return {
		statusCode: 200,
		body: JSON.stringify({
			totalProducts: totalProductsCount,
			active: activeProducts,
			inactive: inactiveProducts,
		}),
	};
};

const getActiveProducts = async (active) => {
	let itemCount = 0;
	let lastEvaluatedKey = undefined;

	do {
		const params = {
			TableName: Table.productsTable.tableName,
			Select: "COUNT",
			FilterExpression: "#availability = :statusValue",
			ExpressionAttributeNames: {
				"#availability": "availability",
			},
			ExpressionAttributeValues: {
				":statusValue": active,
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

const totalProducts = async () => {
	//Best approach for table <2.5gb
	const command = new DescribeTableCommand({
		TableName: Table.productsTable.tableName,
	});
	const response = await docClient.send(command);
	return response.Table.ItemCount;
};
