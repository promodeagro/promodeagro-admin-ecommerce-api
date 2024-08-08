const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function save(tableName, item) {
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

async function findAll(tableName, nextKey) {
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

module.exports = { save, findAll };
