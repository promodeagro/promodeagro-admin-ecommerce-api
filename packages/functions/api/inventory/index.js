import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
	QueryCommand,
	DeleteCommand,
	TransactWriteCommand,
	BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findById } from "../../common/data";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const productsTable = Table.productsTable.tableName;
const inventoryTable = Table.inventoryTable.tableName;

export async function list(nextKey) {
	const params = {
		TableName: productsTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: nextKey,
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

export const updateItemPricing = async (item) => {
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
		return response.Attributes;
	} catch (error) {
		console.error("Unable to update item. Error:", error);
		throw error;
	}
};

export async function get(id) {
	const params = {
		TableName: productsTable,
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

export const searchByName = async (query) => {
	const params = {
		TableName: productsTable,
		FilterExpression: "contains(#search_name, :query)",
		ExpressionAttributeNames: {
			"#search_name": "search_name",
		},
		ExpressionAttributeValues: {
			":query": query.toLowerCase(),
		},
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
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
	return {
		count: data.Count,
		items: res,
	};
};
export const searchByItemCode = async (query) => {
	const params = {
		TableName: Table.inventoryTable.tableName,
		FilterExpression: "contains(#id, :query)",
		ExpressionAttributeNames: {
			"#id": "id",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const res = await Promise.all(
		data.Items.map(async (item) => {
			const productData = await findById(productsTable, item.productId);
			return {
				...item,
				...productData,
				units: productData.unit,
				active: productData.availability,
				itemCode: item.id,
				productId: undefined,
				unit: undefined,
				availability: undefined,
			};
		})
	);

	return {
		count: data.Count,
		items: res,
	};
};

export const inventoryByCategory = async (
	nextKey,
	category,
	subCategory,
	active
) => {
	const params = {
		TableName: productsTable,
		ExpressionAttributeNames: {},
		ExpressionAttributeValues: {},
		FilterExpression: "",
	};
	const addCondition = (condition) => {
		if (params.FilterExpression) {
			params.FilterExpression += " AND ";
		}
		params.FilterExpression += condition;
	};
	if (category) {
		params.ExpressionAttributeNames["#category"] = "category";
		params.ExpressionAttributeValues[":category"] = category;
		addCondition("#category = :category");
	}
	if (subCategory) {
		params.ExpressionAttributeNames["#subCategory"] = "subCategory";
		params.ExpressionAttributeValues[":subCategory"] = subCategory;
		addCondition("#subCategory = :subCategory");
	}

	if (active) {
		let status;
		if (active.toLowerCase() === "false") {
			status = false;
		} else {
			status = true;
		}
		params.ExpressionAttributeNames["#availability"] = "availability";
		params.ExpressionAttributeValues[":availability"] = status;
		if (category) {
			params.FilterExpression += " AND ";
		}
		params.FilterExpression += "#availability = :availability";
	}
	params.ExclusiveStartKey = nextKey
		? {
				id: { S: nextKey },
		  }
		: undefined;
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const lastEvaluatedKey = data.LastEvaluatedKey;
	const res = await productInventoryData(data);
	return {
		count: data.Count,
		items: res,
		nextKey: lastEvaluatedKey,
	};
};
async function productInventoryData(data) {
	return await Promise.all(
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
}

export async function deleteItemById(tableName, id) {
	const params = {
		TableName: tableName,
		Key: {
			id: id,
		},
	};
	const command = new DeleteCommand(params);
	const response = await client.send(command);
	return response;
}

export const updateItem = async (id, item) => {
	const product = await findById(productsTable, id);
	const now = new Date().toISOString(); // Current timestamp in ISO format
	const transactParams = {
		TransactItems: [
			{
				Update: {
					TableName: productsTable,
					Key: { id: id },
					UpdateExpression:
						"SET #nm = :name, #snm = :search_name, #desc = :description, #cat = :category, #subcat = :subCategory, #unt = :unit, #tags = :tags, #upd = :updatedAt",
					ExpressionAttributeNames: {
						"#nm": "name",
						"#snm": "search_name",
						"#desc": "description",
						"#cat": "category",
						"#subcat": "subCategory",
						"#unt": "unit",
						"#tags": "tags",
						"#upd": "updatedAt",
					},
					ExpressionAttributeValues: {
						":name": item.name,
						":search_name": item.name.toLowerCase(),
						":description": item.description,
						":category": item.category,
						":subCategory": item.subCategory,
						":unit": item.units,
						":tags": item.tags ? item.tags.map(tag => tag.toLowerCase()) : [] || [],
						":updatedAt": now,
					},
					ReturnValues: "ALL_NEW",
				},
			},
			{
				Update: {
					TableName: Table.inventoryTable.tableName,
					Key: { id: product.itemCode },
					UpdateExpression: "SET #exp = :expiry, #upd = :updatedAt",
					ExpressionAttributeNames: {
						"#exp": "expiry",
						"#upd": "updatedAt",
					},
					ExpressionAttributeValues: {
						":expiry": item.expiry || null,
						":updatedAt": now,
					},
					ReturnValues: "ALL_NEW",
				},
			},
		],
	};
	const result = await docClient.send(
		new TransactWriteCommand(transactParams)
	);
	console.log(result)
};


export const updateItemStatus = async (req) => {
	const active = req.filter((item) => item.active === true);
	if (active.length !== 0) {
		const invenItems = await Promise.all(
			active.map((item) => inventoryByProdId(item.id))
		);
		for (const item of invenItems) {
			if (!item.onlineStorePrice || !item.compareAt) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						message: "add product prices before activating them",
					}),
				};
			}
		}
	}

	const writeParams = {
		TransactItems: req.map((item) => ({
			Update: {
				TableName: productsTable,
				Key: { id: item.id },
				UpdateExpression: "SET #availability = :availability",
				ExpressionAttributeNames: {
					"#availability": "availability",
				},
				ExpressionAttributeValues: {
					":availability": item.active,
				},
			},
		})),
	};
	await docClient.send(new TransactWriteCommand(writeParams));
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "item updated successfully",
		}),
	};
};

// export const updateProductStatus = async (req) => {
// 	const params = {
// 		RequestItems: {
// 			[productsTable]: {
// 				Keys: req.map((item) => ({ id: item.id })),
// 			},
// 		},
// 	};
// 	const command = new BatchGetCommand(params);
// 	const data = await docClient.send(command);
// 	const products = Object.values(data.Responses)[0];
// 	const invalid = [];
// 	const putReq = products.filter((item) => {
// 			if (item.onlineStorePrice == undefined) {
// 				invalid.push(item.id);
// 				return false;
// 			}
// 			return true;
// 		})
// 		.map((item) => {
// 			return {
// 				Put: {
// 					Item: item,
// 				},
// 			};
// 		});
// };
