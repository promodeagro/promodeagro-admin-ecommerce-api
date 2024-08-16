import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient();

export const handler = async (event) => {
	const fallbackValue = -1;
	// const [lowStockAlert, publishedStock, expired] = await Promise.all([
	// 	getLowStockAlert().catch(() => fallbackValue),
	// 	getPublishedStock().catch(() => fallbackValue),
	// 	getExpired().catch(() => fallbackValue),
	// ]);

	return {
		statusCode: 200,
		body: JSON.stringify({
			allProducts: 0,
			activeStock: 0,
			lowStockAlert: 0,
			expired: 0,
			categories: 0,
		}),
	};
};
