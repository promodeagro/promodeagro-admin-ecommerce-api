import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import z from "zod";
import { Table } from "sst/node/table";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const updateActiveSchema = z.object({
	id: z.string(),
	active: z.boolean(),
});

export const handler = async (event) => {
	const req = JSON.parse(event.body);
	const parseRes = updateActiveSchema.safeParse(req);

	if (!parseRes.success) {
		const errorMessage = parseRes.error.errors
			.map((err) => `${err.path.join(".")}: ${err.message}`)
			.join("; ");
		return {
			statusCode: 400,
			body: JSON.stringify({ message: errorMessage }),
		};
	}

	const { id, active } = req;

	const params = {
		TableName: Table.inventoryTable.tableName,
		Key: {
			id: id,
		},
		UpdateExpression: "set active = :active",
		ExpressionAttributeValues: {
			":active": active,
		},
		ReturnValues: "UPDATED_NEW",
	};

	try {
		const result = await docClient.send(new UpdateCommand(params));
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Item updated successfully",
				updatedAttributes: result.Attributes,
			}),
		};
	} catch (error) {
		console.error("Error updating item in DynamoDB", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error updating item" }),
		};
	}
};
