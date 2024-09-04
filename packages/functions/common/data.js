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

export async function save(tableName, item) {
	const timestamp = new Date().toISOString();
	item = { ...item, createdAt: timestamp, updatedAt: timestamp };
	const params = {
		TableName: tableName,
		Item: item,
	};
	try {
		await docClient.send(new PutCommand(params));
	} catch (err) {
		throw err;
	}
}

export async function findAllFilter(tableName, filters) {
	try {
		const params = {
			TableName: tableName,
			Limit: 50,
			ExclusiveStartKey: filters.nextKey
				? {
						id: { S: filters.nextKey },
				  }
				: undefined,
		};
		if (filters.active) {
			params.IndexName = "active-createdAt-index";
			params.ScanIndexForward = false;
			params.KeyConditionExpression = "#s = :active";
			params.ExpressionAttributeNames = {
				"#s": "active",
			};
			params.ExpressionAttributeValues = {
				":active": filters.active,
			};
		}
		let command;
		if (filters.active) {
			command = new QueryCommand(params);
		} else {
			command = new ScanCommand(params);
		}
		const data = await docClient.send(command);
		if (data.LastEvaluatedKey) {
			filters.nextKey = data.LastEvaluatedKey.id;
		} else {
			filters.nextKey = undefined;
		}
		return {
			count: data.Count,
			items: data.Items,
			nextKey: filters.nextKey,
		};
	} catch (err) {
		throw err;
	}
}

export async function findAll(tableName, nextKey) {
	try {
		const params = {
			TableName: tableName,
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
		return {
			count: data.Count,
			items: data.Items,
			nextKey: nextKey,
		};
	} catch (err) {
		throw err;
	}
}

export async function findById(tableName, id) {
	const params = {
		TableName: tableName,
		Key: {
			id: id,
		},
	};
	const result = await docClient.send(new GetCommand(params));
	return result.Item;
}

/**
 *
 * @param {string} tableName - name of the table
 * @param {Object} key - primaey key of the table : example {id: "1242"}
 * @returns
 */
export async function update(tableName, key, updateData) {
	const updateExpression = [];
	const expressionAttributeValues = {};
	const expressionAttributeNames = {};

	Object.keys(updateData).forEach((attr, index) => {
		updateExpression.push(`#attr${index} = :val${index}`);
		expressionAttributeNames[`#attr${index}`] = attr;
		expressionAttributeValues[`:val${index}`] = updateData[attr];
	});

	const params = {
		TableName: tableName,
		Key: key,
		UpdateExpression: `SET ${updateExpression.join(", ")}`,
		ExpressionAttributeNames: expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ReturnValues: "ALL_NEW",
	};

	try {
		const command = new UpdateCommand(params);
		const response = await docClient.send(command);
		return response.Attributes;
	} catch (error) {
		console.error("Error updating item:", error);
		throw error;
	}
}

export async function productExistsByName(tableName, productName) {
	const params = {
		TableName: tableName,
		FilterExpression: "#name = :name",
		ExpressionAttributeNames: {
			"#name": "name",
		},
		ExpressionAttributeValues: {
			":name": productName,
		},
		Limit: 1, // We only need to know if at least one item exists
	};

	try {
		console.log(JSON.stringify(productName));
		const command = new ScanCommand(params);
		const response = await docClient.send(command);
		console.log(JSON.stringify(response));
		return !!response.Items && response.Items.length > 0;
	} catch (error) {
		console.error("Error scanning DynamoDB:", error);
		throw error;
	}
}

export const itemExits = async (tableName, name) => {
	const queryParams = {
		TableName: tableName,
		IndexName: "nameIndex",
		KeyConditionExpression: "#itemName = :name",
		ExpressionAttributeNames: {
			"#itemName": "name",
		},
		ExpressionAttributeValues: {
			":name": name,
		},
	};
	const queryCommand = new QueryCommand(queryParams);
	const queryResult = await docClient.send(queryCommand);

	return queryResult.Items && queryResult.Items.length > 0;
};

export const searchInventory = async (query) => {
	const params = {
		TableName: Table.inventoryTable.tableName,
		FilterExpression:
			"contains(#itemCode, :query) OR contains(#name, :query)",
		ExpressionAttributeNames: {
			"#itemCode": "itemCode",
			"#name": "name",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	return data.Items;
};

export const inventoryByCategory = async (nextKey, category, active) => {
	const params = {
		TableName: Table.inventoryTable.tableName,
		ExpressionAttributeNames: {},
		ExpressionAttributeValues: {},
		FilterExpression: "",
	};

	if (category) {
		params.ExpressionAttributeNames["#category"] = "category";
		params.ExpressionAttributeValues[":category"] = category;
		params.FilterExpression += "#category = :category";
	}

	if (active) {
		let status;
		if(active.toLowerCase() === 'false'){
			status = false
		}else{
			status = true
		}
		params.ExpressionAttributeNames["#active"] = "active";
		params.ExpressionAttributeValues[":active"] = status;
		if (category) {
			params.FilterExpression += " AND ";
		}
		params.FilterExpression += "#active = :active";
	}
	params.ExclusiveStartKey = nextKey
		? {
				id: { S: nextKey },
		  }
		: undefined;
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const lastEvaluatedKey = data.LastEvaluatedKey;

	return {
		count: data.Count,
		items: data.Items,
		nextKey: lastEvaluatedKey,
	};
};
