import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
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

export async function findAll(tableName, nextKey) {
	try {
		const params = {
			TableName: tableName,
			Limit: 10,
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
