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

// export async function list(nextKey) {
// 	const params = {
// 		TableName: productsTable,
// 		Limit: 50,
// 		ExclusiveStartKey: nextKey
// 			? {
// 					id: nextKey,
// 			  }
// 			: undefined,
// 	};
// 	const command = new ScanCommand(params);
// 	const data = await docClient.send(command);
// 	if (data.LastEvaluatedKey) {
// 		nextKey = data.LastEvaluatedKey.id;
// 	} else {
// 		nextKey = undefined;
// 	}
// 	const res = await Promise.all(
// 		data.Items.map(async (item) => {
// 			const inventoryData = await inventoryByProdId(item.id);
// 			const itemCode = inventoryData.id;
// 			delete inventoryData.id;
// 			return {
// 				...item,
// 				...inventoryData,
// 				units: item.unit,
// 				active: item.availability,
// 				itemCode: itemCode,
// 				productId: undefined,
// 				unit: undefined,
// 				availability: undefined,
// 			};
// 		})
// 	);
// 	return {
// 		count: data.Count,
// 		items: res,
// 		nextKey: nextKey,
// 	};
// }

export async function list(nextKey) {
  const params = {
    TableName: Table.productsTable.tableName,
    Limit: 50,
    ExclusiveStartKey: nextKey ? { id: nextKey } : undefined,
  };

  const command = new ScanCommand(params);
  const data = await docClient.send(command);

  // Map product items to the expected format
  const products = data.Items.map((item) => ({
    ...item,
    units: item.units || item.unit || null,
    active: item.availability || false,
    itemCode: item.id, // Assuming the `id` is equivalent to the item code
    attribute: item.attribute || null, // Include attribute name
    productId: undefined,
    unit: undefined,
    availability: undefined,
    image: item.image || (item.images && item.images[0]) || null,
    images: item.images || [],
    overallStock: item.overallStock || null,
    overallStockUnit: item.overallStockUnit || null,
    expiry: item.expiry || null,
  }));

  return {
    count: data.Count,
    items: products,
    nextKey: data.LastEvaluatedKey?.id,
  };
}


async function inventoryByProdId(productId) {
	const InventoryParams = {
		TableName: Table.productsTable.tableName,
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

export const updateProductTableStockAndPrice = async (item) => {
	const params = {
		TableName: Table.productsTable.tableName,
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
		console.error("Unable to update product. Error:", error);
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
	// const inventory = await inventoryByProdId(product.id);
	// const itemCode = inventory.id;
	// delete inventory.id;
	return {
		...product,
		units: product.units || product.unit || null,
		active: product.availability || false,
		itemCode: product.id,
		attribute: product.attribute || null, // Include attribute name
		image: product.image || (product.images && product.images[0]) || null,
		images: product.images || [],
		overallStock: product.overallStock || null,
		overallStockUnit: product.overallStockUnit || null,
		expiry: product.expiry || null,
		// ...inventory,
		// productId: undefined,
		// unit: undefined,
		// availability: undefined,
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
			// const inventoryData = await inventoryByProdId(item.id);
			// const itemCode = inventoryData.id;
			// delete inventoryData.id;
			return {
				...item,
				units: item.units || item.unit || null,
				active: item.availability || false,
				itemCode: item.id,
				attribute: item.attribute || null, // Include attribute name
				// ...inventoryData,
				// productId: undefined,
				// unit: undefined,
				// availability: undefined,
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
				attribute: productData.attribute || null, // Include attribute name
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
		? { id: nextKey }
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
			// const inventoryData = await inventoryByProdId(item.id);
			// const itemCode = inventoryData.id;
			// delete inventoryData.id;
			return {
				...item,
				units: item.units || item.unit || null,
				active: item.availability || false,
				itemCode: item.id,
				attribute: item.attribute || null, // Include attribute name
				// ...inventoryData,
				// productId: undefined,
				// unit: undefined,
				// availability: undefined,
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
	const now = new Date().toISOString(); // Current timestamp in ISO format
  
	// Ensure images array is handled correctly
	const images = item.images || [];
	const mainImage = images.length > 0 ? images[0] : null;
  
	// Build dynamic update expression and values
	const updateExpressions = [];
	const expressionAttributeNames = {};
	const expressionAttributeValues = {};
  
	// Helper function to add field to update
	const addField = (fieldName, value, dynamoName = fieldName) => {
		if (value !== undefined && value !== null) {
			updateExpressions.push(`#${dynamoName} = :${dynamoName}`);
			expressionAttributeNames[`#${dynamoName}`] = fieldName;
			expressionAttributeValues[`:${dynamoName}`] = value;
		}
	};
  
	// Add fields that should always be updated
	addField("name", item.name, "nm");
	addField("search_name", item.name ? item.name.toLowerCase() : undefined, "snm");
	addField("description", item.description, "desc");
	addField("category", item.category, "cat");
	addField("subCategory", item.subCategory, "subcat");
	addField("units", item.units, "unt");
	addField("tags", item.tags ? item.tags.map(tag => tag.toLowerCase()) : undefined, "tags");
	addField("expiry", item.expiry, "exp");
	addField("updatedAt", now, "upd");
	addField("availability", item.availability, "avail");
	addField("totalQuantityInB2c", item.totalQuantityInB2C, "totalB2c");
	addField("totalquantityB2cUnit", item.totalquantityB2cUnit, "totalB2cUnit");
	addField("stockQuantity", item.stockQuantity, "stockQty");
	addField("stockQuantityAlert", item.stockQuantityAlert, "stockQtyAlert");
	addField("purchasingPrice", item.purchasingPrice, "pPrice");
	addField("sellingPrice", item.sellingPrice, "sPrice");
	addField("comparePrice", item.comparePrice, "cPrice");
	addField("overallStock", item.overallStock, "overallStock");
	addField("overallStockUnit", item.overallStockUnit, "overallStockUnit");
	addField("attribute", item.attribute, "attr");
	addField("image", mainImage, "img");
	addField("images", images, "imgs");
  
	// Ensure we have at least one field to update
	if (updateExpressions.length === 0) {
		throw new Error("No valid fields to update");
	}
  
	const transactParams = {
	  TransactItems: [
		{
		  Update: {
			TableName: productsTable,
			Key: { id: id },
			UpdateExpression: `SET ${updateExpressions.join(", ")}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW",
		  },
		},
	  ],
	};
  
	const result = await docClient.send(new TransactWriteCommand(transactParams));
	console.log(result);
  };
  
  

export const updateItemStatus = async (req) => {
	const active = req.filter((item) => item.active === true);
	// if (active.length !== 0) {
	// 	const invenItems = await Promise.all(
	// 		active.map((item) => inventoryByProdId(item.id))
	// 	);
	// 	// for (const item of invenItems) {
	// 	// 	if (!item.onlineStorePrice || !item.compareAt) {
	// 	// 		return {
	// 	// 			statusCode: 400,
	// 	// 			body: JSON.stringify({
	// 	// 				message: "add product prices before activating them",
	// 	// 			}),
	// 	// 		};
	// 	// 	}
	// 	// }
	// }

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

export async function getByGroupId(groupId) {
	const params = {
		TableName: productsTable,
		FilterExpression: "#groupId = :groupId",
		ExpressionAttributeNames: {
			"#groupId": "groupId",
		},
		ExpressionAttributeValues: {
			":groupId": groupId,
		},
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);

	if (!data.Items || data.Items.length === 0) {
		return null;
	}

	// Map products to the expected format
	const products = data.Items.map((item) => ({
		...item,
		units: item.units || item.unit || null,
		active: item.availability || false,
		itemCode: item.id,
		attribute: item.attribute || null, // Include attribute name
		productId: undefined,
		unit: undefined,
		availability: undefined,
		image: item.image || (item.images && item.images[0]) || null,
		images: item.images || [],
		overallStock: item.overallStock || null,
		overallStockUnit: item.overallStockUnit || null,
		expiry: item.expiry || null,
	}));

	// Group products by groupId (should be the same for all items)
	const groupedProduct = {
		groupId: groupId,
		name: products[0].name,
		category: products[0].category,
		subCategory: products[0].subCategory,
		description: products[0].description,
		image: products[0].image,
		images: products[0].images || [],
		tags: products[0].tags || [],
		overallStock: products[0].overallStock || null,
		overallStockUnit: products[0].overallStockUnit || null,
		variations: products
	};

	return groupedProduct;
}

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

export { handler as addVariantHandler } from "./add-variant";
export { handler as deleteGroupHandler } from "./delete-group";
export { handler as updateGroupHandler } from "./update-group";
