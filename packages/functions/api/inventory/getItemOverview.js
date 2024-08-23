// TODO
import {
	DynamoDBClient,
	GetItemCommand,
	ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Table } from "sst/node/table";

const REGION = "us-east-1";
const dynamoDbClient = new DynamoDBClient({ region: REGION });

export const handler = async (event) => {
	const id = event.pathParameters.productId;

	try {
		const productData = await getItemFromTable("Products", "id", id, {
			"#cat": "category",
			"#lastChangedAt": "_lastChangedAt",
			"#availability": "availability",
		});

		if (!productData) {
			return {
				statusCode: 404,
				body: JSON.stringify({ error: "Product not found" }),
			};
		}

		const salesData = await scanTable("sales", "productId", id, {
			"#QuantityUnits": "QuantityUnits",
		});

		const inventoryData = await scanTable(
			Table.inventoryTable.tableName,
			"productId",
			id,
			{
				"#availableQty": "availableQuantity",
				"#unit": "unit",
				"#invId": "id",
			}
		);

		const combinedData = {
			product: {
				Stock: productData.availability,
				category: productData.category,
				CretedSource: productData._lastChangedAt,
			},
			sales: salesData.map((item) => ({
				SellingPrice: "TODO",
				PurchasePrice: "TODO",
			})),
			inventory: inventoryData.map((item) => ({
				availableQuantity: item.availableQuantity,
				unit: item.unit,
				itemCode: item.id,
			})),
		};

		return {
			statusCode: 200,
			body: JSON.stringify(combinedData),
		};
	} catch (error) {
		console.error("Error fetching data:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: "Error fetching data",
				details: error.message,
			}),
		};
	}
};

async function getItemFromTable(tableName, keyName, keyValue, attributesToGet) {
	const params = {
		TableName: tableName,
		Key: {
			[keyName]: { S: keyValue },
		},
		ProjectionExpression: Object.keys(attributesToGet).join(", "),
		ExpressionAttributeNames: attributesToGet,
	};

	try {
		const command = new GetItemCommand(params);
		const result = await dynamoDbClient.send(command);
		return result.Item ? unmarshall(result.Item) : null;
	} catch (error) {
		console.error(`Error fetching data from table ${tableName}:`, error);
		throw error;
	}
}

async function scanTable(
	tableName,
	attributeName,
	attributeValue,
	attributesToGet
) {
	const params = {
		TableName: tableName,
		FilterExpression: `${attributeName} = :value`,
		ExpressionAttributeValues: {
			":value": { S: attributeValue },
		},
		ProjectionExpression: Object.keys(attributesToGet).join(", "),
		ExpressionAttributeNames: attributesToGet,
	};

	try {
		const command = new ScanCommand(params);
		const result = await dynamoDbClient.send(command);
		return result.Items ? result.Items.map((item) => unmarshall(item)) : [];
	} catch (error) {
		console.error(`Error scanning data from table ${tableName}:`, error);
		throw error;
	}
}
