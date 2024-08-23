import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	ScanCommand,
	GetCommand,
	UpdateCommand,
	QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { save } from "../common/data";
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function script() {
	const params = {
		TableName: tableName,
	};
	try {
		let items = [];
		let lastEvaluatedKey = null;

		do {
			const data = await dynamoDbClient.send(new ScanCommand(params));

			if (data.Items) {
				items = items.concat(data.Items);
			}

			lastEvaluatedKey = data.LastEvaluatedKey;
			params.ExclusiveStartKey = lastEvaluatedKey;
		} while (lastEvaluatedKey);
		items.map(async (item) => {
			await save(Table, item);
		});
	} catch (error) {
		console.error("Error fetching items:", error);
		throw new Error("Could not fetch items from DynamoDB");
	}
}
