import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	ScanCommand,
	PutCommand,
} from "@aws-sdk/lib-dynamodb";

const sourceClient = new DynamoDBClient({ region: "ap-south-1" });
const sourceDocClient = DynamoDBDocumentClient.from(sourceClient);

const destClient = new DynamoDBClient({ region: "ap-south-1" });
const destDocClient = DynamoDBDocumentClient.from(destClient);

const products = await getAll("prod-promodeargo-admin-productsTable");
const inventory = await getAll("prod-promodeargo-admin-inventoryTable");

let i = 0;
for (const product of products.items) {
	console.log(`ADDING PRODUCTS ${i++}`);
	await save("prod-promodeagro-admin-productsTable", product);
}
i = 0;
for (const inven of inventory.items) {
	console.log(`ADDING INVENTORY ${i++}`);
	await save("prod-promodeagro-admin-inventoryTable", inven);
}

export async function getAll(tableName, nextKey) {
	try {
		const params = {
			TableName: tableName,
		};
		const command = new ScanCommand(params);
		const data = await sourceDocClient.send(command);
		if (data.LastEvaluatedKey) {
			nextKey = data.LastEvaluatedKey.id;
		} else {
			nextKey = undefined;
		}
		return {
			count: data.Count,
			items: data.Items,
			nextKey: nextKey,
		};
	} catch (err) {
		throw err;
	}
}

export async function save(tableName, item) {
	const params = {
		TableName: tableName,
		Item: item,
	};
	try {
		await destDocClient.send(new PutCommand(params));
	} catch (err) {
		throw err;
	}
}
