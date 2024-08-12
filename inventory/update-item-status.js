require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
	DynamoDBDocumentClient,
	UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const z = require("zod");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const updateActiveSchema = z.object({
	id: z.string(),
	active: z.boolean(),
});

module.exports.handler = async (event) => {
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
		TableName: process.env.INVENTORY_TABLE,
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
