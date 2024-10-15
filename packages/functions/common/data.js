import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
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
	const params = {
		TableName: tableName,
		Limit: 50,
		ExclusiveStartKey: filters.nextKey
			? {
					id: { S: filters.nextKey },
			  }
			: undefined,
	};
	if (filters.status === "delivered") {
		let d = filters.date;
		let query;
		let now = new Date();
		if (d == undefined) {
			now.setDate(now.getDate() - 7);
			query = ` AND createdAt > :date`;
		} else if (d == "older") {
			now.setMonth(now.getMonth() - 3);
			query = ` AND createdAt > :date`;
		} else if (d == "2m") {
			now.setMonth(now.getMonth() - 2);
			query = ` AND createdAt > :date`;
		} else if (d == "1m") {
			now.setMonth(now.getMonth() - 1);
			query = ` AND createdAt > :date`;
		} else if (d == "14") {
			now.setDate(now.getDate() - 14);
			query = ` AND createdAt > :date`;
		} else if (d == "7") {
			now.setDate(now.getDate() - 7);
			query = ` AND createdAt > :date`;
		}
		params.IndexName = "statusCreatedAtIndex";
		params.ScanIndexForward = false;
		params.KeyConditionExpression = "#s = :status" + query;
		params.ExpressionAttributeNames = {
			"#s": "status",
		};
		params.ExpressionAttributeValues = {
			":status": filters.status,
			":date": now.toISOString(),
		};
	} else if (filters.status) {
		params.IndexName = "statusCreatedAtIndex";
		params.ScanIndexForward = false;
		params.KeyConditionExpression = "#s = :status";
		params.ExpressionAttributeNames = {
			"#s": "status",
		};
		params.ExpressionAttributeValues = {
			":status": filters.status,
		};
	}
	let command;
	if (filters.status) {
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
}

export async function findAll(tableName, nextKey, indexName) {
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
		if (indexName) {
			params.IndexName = indexName;
			params.ScanIndexForward = false;
		}
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
		const command = new ScanCommand(params);
		const response = await docClient.send(command);
		return !!response.Items && response.Items.length > 0;
	} catch (error) {
		console.error("Error scanning DynamoDB:", error);
		throw error;
	}
}

export const itemExits = async (tableName, name) => {
	const queryParams = {
		TableName: tableName,
		IndexName: "search_nameIndex",
		KeyConditionExpression: "#itemName = :search_name",
		ExpressionAttributeNames: {
			"#itemName": "search_name",
		},
		ExpressionAttributeValues: {
			":search_name": name.toLowerCase(),
		},
	};
	const queryCommand = new QueryCommand(queryParams);
	const queryResult = await docClient.send(queryCommand);

	return queryResult.Items && queryResult.Items.length > 0;
};
