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

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTable = Table.OrdersTable.tableName;

export const listOrdersInventory = async (type, nextKey) => {
	const params = {
		TableName: orderTable,
		Limit: 50,
		ExclusiveStartKey: nextKey
			? {
					id: { S: nextKey },
			  }
			: undefined,
	};
	if (type) {
		(params.FilterExpression = "paymentDetails.#m = :method"),
			(params.ExpressionAttributeNames = {
				"#m": "method",
			}),
			(params.ExpressionAttributeValues = {
				":method": type,
			});
	}
    console.log(params);
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
};
