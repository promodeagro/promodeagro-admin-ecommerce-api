import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

export async function list(nextKey) {
	const params = {
		TableName: Table.productsTable.tableName,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
	};
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	if (data.LastEvaluatedKey) {
		nextKey = data.LastEvaluatedKey.id;
	} else {
		nextKey = undefined;
	}
	console.log(data.Items);
	const res = await Promise.all(
		data.Items.map(async (item) => {
			const inventoryData = await inventoryByProdId(item.id);
			const itemCode = inventoryData.id;
			delete inventoryData.id;
			return {
				...item,
				...inventoryData,
				units: item.unit,
				active: item.availability,
				itemCode: itemCode,
				productId: undefined,
				unit: undefined,
				availability: undefined,
			};
		})
	);

	console.log(res);
	return {
		count: data.Count,
		items: res,
		nextKey: nextKey,
	};
}

async function inventoryByProdId(productId) {
	const InventoryParams = {
		TableName: Table.inventoryTable.tableName,
		IndexName: "productIdIndex",
		KeyConditionExpression: "productId = :productId",
		ExpressionAttributeValues: {
			":productId": productId,
		},
		Limit: 1,
	};
	const command = new QueryCommand(InventoryParams);
	const response = await docClient.send(command);
	return response.Items[0];
}

export const updateItem = async (item) => {
	const params = {
		TableName: Table.inventoryTable.tableName,
		Key: { id: item.itemCode },
		UpdateExpression:
			"SET msp = :msp, purchasingPrice = :pp, stockQuantity = stockQuantity + :aq",
		ExpressionAttributeValues: {
			":msp": item.newOnlineStorePrice,
			":pp": item.newPurchasingPrice,
			":aq": item.adjustQuantity,
		},
		ReturnValues: "ALL_NEW",
	};
	try {
		const command = new UpdateCommand(params);
		const response = await docClient.send(command);
		console.log("Update succeeded:", response.Attributes);
		return response.Attributes;
	} catch (error) {
		console.error("Unable to update item. Error:", error);
		throw error;
	}
};

export async function get(id) {
	const params = {
		TableName: Table.productsTable.tableName,
		Key: {
			id: id,
		},
		Limit: 1,
	};
	const productRes = await docClient.send(new GetCommand(params));
	const product = productRes.Item;
	const inventory = await inventoryByProdId(product.id);
	const itemCode = inventory.id;
	delete inventory.id;
	return {
		...product,
		...inventory,
		units: product.unit,
		active: product.availability,
		itemCode: itemCode,
		productId: undefined,
		unit: undefined,
		availability: undefined,
	};
}
