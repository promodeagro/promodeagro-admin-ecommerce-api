require("dotenv").config();
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const dynamoClient = new DynamoDBClient();

module.exports.handler = async (event) => {
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