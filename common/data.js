const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function save(tableName, item) {
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

async function findById(tableName, id) {
	const params = {
		TableName: tableName,
		Key: {
			id: id,
		},
	};
	const result = await docClient.send(new GetCommand(params));
	return result.Item;
}

module.exports = { save, findAll, findById };
