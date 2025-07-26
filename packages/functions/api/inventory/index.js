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
import { updateSharedStockAcrossVariants } from "./unitUtils";

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
	// First, fetch the current item data to determine which field to update
	const getParams = {
		TableName: Table.inventoryTable.tableName,
		Key: { id: item.itemCode },
	};
	
	let currentItem;
	try {
		const { Item } = await docClient.send(new GetCommand(getParams));
		currentItem = Item;
	} catch (error) {
		console.error("Unable to fetch current item data. Error:", error);
		throw error;
	}

	// Determine which field to update: stockQuantity or overallStock
	// Check if the item has stockQuantity with a valid value (not null, undefined, empty, or 0)
	const hasValidStockQuantity = currentItem && 
		currentItem.stockQuantity !== null && 
		currentItem.stockQuantity !== undefined && 
		currentItem.stockQuantity !== "" && 
		currentItem.stockQuantity !== 0;
	const updateField = hasValidStockQuantity ? 'stockQuantity' : 'overallStock';
	
	const params = {
		TableName: Table.inventoryTable.tableName,
		Key: { id: item.itemCode },
		UpdateExpression:
			updateField === 'stockQuantity'
				? "SET msp = :msp, purchasingPrice = :pp, stockQuantity = stockQuantity + :aq"
				: "SET msp = :msp, purchasingPrice = :pp, overallStock = if_not_exists(overallStock, :zero) + :aq",
		ExpressionAttributeValues: {
			":msp": item.newOnlineStorePrice,
			":pp": item.newPurchasingPrice,
			":aq": item.adjustQuantity,
			...(updateField === 'overallStock' && { ":zero": 0 }),
		},
		ReturnValues: "ALL_NEW",
	};
	try {
		const command = new UpdateCommand(params);
		const response = await docClient.send(command);

		// If updating overallStock, also update all variants in the group
		if (updateField === 'overallStock') {
			// Use the fetched product data to get groupId
			if (currentItem && currentItem.groupId) {
				const operation = item.adjustQuantity >= 0 ? 'add' : 'subtract';
				await updateSharedStockAcrossVariants(currentItem.groupId, Math.abs(item.adjustQuantity), operation, docClient, Table.inventoryTable.tableName, item.itemCode);
			}
		}

		return response.Attributes;
	} catch (error) {
		console.error("Unable to update item. Error:", error);
		throw error;
	}
};

export const updateProductTableStockAndPrice = async (item) => {
	// First, fetch the current item data to determine which field to update
	const getParams = {
		TableName: Table.productsTable.tableName,
		Key: { id: item.itemCode },
	};
	
	let currentItem;
	try {
		const { Item } = await docClient.send(new GetCommand(getParams));
		currentItem = Item;
	} catch (error) {
		console.error("Unable to fetch current product data. Error:", error);
		throw error;
	}

	// Determine which field to update: stockQuantity or overallStock
	// Check if the item has stockQuantity with a valid value (not null, undefined, empty, or 0)
	const hasValidStockQuantity = currentItem && 
		currentItem.stockQuantity !== null && 
		currentItem.stockQuantity !== undefined && 
		currentItem.stockQuantity !== "" && 
		currentItem.stockQuantity !== 0;
	const updateField = hasValidStockQuantity ? 'stockQuantity' : 'overallStock';
	
	const params = {
		TableName: Table.productsTable.tableName,
		Key: { id: item.itemCode },
		UpdateExpression:
			updateField === 'stockQuantity'
				? "SET msp = :msp, purchasingPrice = :pp, stockQuantity = stockQuantity + :aq"
				: "SET msp = :msp, purchasingPrice = :pp, overallStock = if_not_exists(overallStock, :zero) + :aq",
		ExpressionAttributeValues: {
			":msp": item.newOnlineStorePrice,
			":pp": item.newPurchasingPrice,
			":aq": item.adjustQuantity,
			...(updateField === 'overallStock' && { ":zero": 0 }),
		},
		ReturnValues: "ALL_NEW",
	};
	try {
		const command = new UpdateCommand(params);
		const response = await docClient.send(command);

		// If updating overallStock, also update all variants in the group
		if (updateField === 'overallStock') {
			// Use the fetched product data to get groupId
			if (currentItem && currentItem.groupId) {
				const operation = item.adjustQuantity >= 0 ? 'add' : 'subtract';
				await updateSharedStockAcrossVariants(currentItem.groupId, Math.abs(item.adjustQuantity), operation, docClient, Table.productsTable.tableName, item.itemCode);
			}
		}

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
	active,
	expiry
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
		addCondition("#availability = :availability");
	}

	if (expiry) {
		// Since expiry is stored as string in DB (e.g., "2025-07-24"), 
		// we compare it directly as a string
		params.ExpressionAttributeNames["#expiry"] = "expiry";
		params.ExpressionAttributeValues[":expiry"] = expiry;
		addCondition("#expiry = :expiry");
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

/**
 * Helper function to get sales data for variants from order history
 * @param {Array<string>} variantIds - Array of variant product IDs
 * @param {string} dateFilter - Date filter: "today", "yesterday", "14d", "1m", "2m", "older"
 * @returns {Object} - Sales data object with metrics for each variant
 */
async function getSalesDataForVariants(variantIds, dateFilter) {
	try {
		// Calculate date range based on filter
		let startDate, endDate;
		const now = new Date();
		
		switch (dateFilter) {
			case "today":
				startDate = new Date(now);
				startDate.setHours(0, 0, 0, 0);
				endDate = new Date(now);
				endDate.setHours(23, 59, 59, 999);
				break;
			case "yesterday":
				startDate = new Date(now);
				startDate.setDate(startDate.getDate() - 1);
				startDate.setHours(0, 0, 0, 0);
				endDate = new Date(startDate);
				endDate.setHours(23, 59, 59, 999);
				break;
			case "14d":
				startDate = new Date(now);
				startDate.setDate(startDate.getDate() - 14);
				startDate.setHours(0, 0, 0, 0);
				break;
			case "1m":
				startDate = new Date(now);
				startDate.setMonth(startDate.getMonth() - 1);
				startDate.setHours(0, 0, 0, 0);
				break;
			case "2m":
				startDate = new Date(now);
				startDate.setMonth(startDate.getMonth() - 2);
				startDate.setHours(0, 0, 0, 0);
				break;
			case "older":
				startDate = new Date(now);
				startDate.setMonth(startDate.getMonth() - 3);
				startDate.setHours(0, 0, 0, 0);
				break;
			default:
				// No filter - get all data
				startDate = null;
				endDate = null;
		}

		const params = {
			TableName: Table.OrdersTable.tableName,
			FilterExpression: "attribute_exists(items)",
		};

		// Add date filter if specified
		if (startDate) {
			if (endDate) {
				// For today/yesterday with specific end date
				params.FilterExpression += " AND createdAt BETWEEN :startDate AND :endDate";
				params.ExpressionAttributeValues = {
					":startDate": startDate.toISOString(),
					":endDate": endDate.toISOString()
				};
			} else {
				// For other periods with only start date
				params.FilterExpression += " AND createdAt >= :startDate";
				params.ExpressionAttributeValues = {
					":startDate": startDate.toISOString()
				};
			}
		}

		const command = new ScanCommand(params);
		const data = await docClient.send(command);

		// Initialize sales data for each variant
		const salesData = {};
		variantIds.forEach(id => {
			salesData[String(id)] = {
				totalSold: 0,        // Total units sold
				totalQuantity: 0,    // Same as totalSold (for consistency)
				orderCount: 0,       // Number of orders containing this variant
				totalRevenue: 0,     // Total revenue from this variant
				averageOrderValue: 0 // Average revenue per order
			};
		});

		// Process each order to count sales
		if (data.Items && Array.isArray(data.Items)) {
			data.Items.forEach(order => {
				if (order.items && Array.isArray(order.items)) {
					// Track which variants are in this order to avoid double-counting orderCount
					const variantsInThisOrder = new Set();
					
					order.items.forEach(item => {
						const itemProductId = String(item.productId);
						if (itemProductId && salesData[itemProductId]) {
							const quantity = parseFloat(item.quantity) || 0;
							const price = parseFloat(item.price) || 0;
							const revenue = quantity * price;
							
							salesData[itemProductId].totalSold += quantity;      // Count actual units sold
							salesData[itemProductId].totalQuantity += quantity;  // Same as totalSold
							salesData[itemProductId].totalRevenue += revenue;
							variantsInThisOrder.add(itemProductId);              // Track variant in this order
						}
					});
					
					// Increment orderCount only once per variant per order
					variantsInThisOrder.forEach(variantId => {
						salesData[variantId].orderCount += 1;
					});
				}
			});
		}

		// Calculate average order value for each variant
		Object.keys(salesData).forEach(id => {
			if (salesData[id].orderCount > 0) {
				salesData[id].averageOrderValue = salesData[id].totalRevenue / salesData[id].orderCount;
			}
		});

		return salesData;
	} catch (error) {
		console.error("Error fetching sales data:", error);
		// Return empty sales data if there's an error
		const emptySalesData = {};
		variantIds.forEach(id => {
			emptySalesData[String(id)] = {
				totalSold: 0,        // Total units sold
				totalQuantity: 0,    // Same as totalSold (for consistency)
				orderCount: 0,       // Number of orders containing this variant
				totalRevenue: 0,     // Total revenue from this variant
				averageOrderValue: 0 // Average revenue per order
			};
		});
		return emptySalesData;
	}
}

/**
 * Get product group by groupId with enhanced sales information
 * @param {string} groupId - The group ID to fetch
 * @param {string} dateFilter - Optional date filter: "today", "yesterday", "14d", "1m", "2m", "older"
 * @returns {Object|null} - Product group with sales data for each variant
 * 
 * Returns:
 * - Basic product group information (name, category, description, etc.)
 * - Array of variations with individual sales metrics
 * - Group-level sales statistics including best/least selling variants
 * - Sales metrics per variant:
 *   * totalSold: Total units sold (e.g., 5 biscuit packets = 5)
 *   * totalQuantity: Same as totalSold (for consistency)
 *   * orderCount: Number of orders containing this variant (e.g., 1 order with 5 packets = 1)
 *   * totalRevenue: Total revenue from this variant
 *   * averageOrderValue: Average revenue per order containing this variant
 * 
 * Date Filter Options:
 * - "today": Sales from today only
 * - "yesterday": Sales from yesterday only
 * - "14d": Sales from last 14 days
 * - "1m": Sales from last 1 month
 * - "2m": Sales from last 2 months
 * - "older": Sales from last 3 months
 * - undefined/null: All time sales data
 */
export async function getByGroupId(groupId, dateFilter) {
	try {
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

		// Get variant IDs for sales data lookup
		const variantIds = data.Items.map(item => item.id);

		// Get sales data for all variants with date filter
		const salesData = await getSalesDataForVariants(variantIds, dateFilter);

	// Map products to the expected format with sales data
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
		// Add sales information
		salesInfo: {
			totalSold: salesData[String(item.id)]?.totalSold || 0,
			totalQuantity: salesData[String(item.id)]?.totalQuantity || 0,
			orderCount: salesData[String(item.id)]?.orderCount || 0,
			totalRevenue: salesData[String(item.id)]?.totalRevenue || 0,
			averageOrderValue: salesData[String(item.id)]?.averageOrderValue || 0
		}
	}));

	// Calculate group-level sales statistics
	const groupSalesStats = {
		totalVariantsSold: 0,
		totalGroupQuantity: 0,
		totalGroupRevenue: 0,
		totalGroupOrders: 0,
		bestSellingVariant: null,
		leastSellingVariant: null
	};

	// Aggregate sales data across all variants
	products.forEach(product => {
		const sales = product.salesInfo;
		if (sales.totalSold > 0) {
			groupSalesStats.totalVariantsSold += 1;
		}
		groupSalesStats.totalGroupQuantity += sales.totalQuantity;
		groupSalesStats.totalGroupRevenue += sales.totalRevenue;
		groupSalesStats.totalGroupOrders += sales.orderCount;
	});

	// Find best and least selling variants
	let maxSold = 0;
	let minSold = Infinity;
	products.forEach(product => {
		const sold = product.salesInfo.totalSold;
		if (sold > maxSold) {
			maxSold = sold;
			groupSalesStats.bestSellingVariant = {
				id: product.id,
				name: product.name,
				attribute: product.attribute,
				totalSold: sold,
				totalRevenue: product.salesInfo.totalRevenue
			};
		}
		if (sold > 0 && sold < minSold) {
			minSold = sold;
			groupSalesStats.leastSellingVariant = {
				id: product.id,
				name: product.name,
				attribute: product.attribute,
				totalSold: sold,
				totalRevenue: product.salesInfo.totalRevenue
			};
		}
	});

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
		variations: products,
		groupSalesStats: groupSalesStats,
		dateFilter: dateFilter || "all-time" // Include the applied date filter in response
	};

	return groupedProduct;
	} catch (error) {
		console.error("Error in getByGroupId:", error);
		throw error;
	}
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
