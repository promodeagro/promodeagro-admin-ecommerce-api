import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const notificationsTable = Table.notificationsTable.tableName;

export const list = async (id) => {
	const params = {
		TableName: notificationsTable,
		IndexName: "userIndex",
		KeyConditionExpression: "userId = :userId",
		FilterExpression:
			"#readStatus = :unread AND (attribute_not_exists(#ttlField) OR #ttlField > :now)",
		ExpressionAttributeNames: {
			"#readStatus": "read",
			"#ttlField": "ttl",
		},
		ExpressionAttributeValues: {
			":userId": id,
			":unread": false,
			":now": Math.floor(Date.now() / 1000),
		},

		ScanIndexForward: false,
	};
	const data = await docClient.send(new QueryCommand(params));
	return data.Items;
};
