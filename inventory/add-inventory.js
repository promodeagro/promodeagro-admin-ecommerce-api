require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");
const z = require("zod");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const inventoryItemSchema = z.object({
	name: z.string(),
	description: z.string(),
	category: z.string(),
	units: z.string(),
	purchasingPrice: z.number().positive(),
	msp: z.number().positive(),
	stockQuantity: z.number().int().nonnegative(),
	expiry: z.string().datetime(),
	images: z.array(z.string().url()).min(1, "at least 1 image is required"),
});

module.exports.handler = async (event) => {
	const req = JSON.parse(event.body);
	const parseRes = inventoryItemSchema.safeParse(req);
	if (!parseRes.success) {
		const errorMessage = parseRes.error.errors
			.map((err) => `${err.path.join(".")}: ${err.message}`)
			.join("; ");
		return {
			statusCode: 400,
			body: JSON.stringify({ message: errorMessage }),
		};
	}
	const itemCode = crypto.randomUUID().split("-")[0];
	const params = {
		TableName: process.env.INVENTORY_TABLE,
		Item: {
			itemCode,
			name: req.name,
			description: req.description,
			category: req.category,
			units: req.units,
			purchasingPrice: Number(req.purchasingPrice),
			msp: Number(req.msp),
			stockQuantity: Number(req.stockQuantity),
			expiry: req.expiry,
			updatedAt: new Date().toISOString(),
			images: req.images || [],
		},
	};

	try {
		await docClient.send(new PutCommand(params));
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Item added successfully" }),
		};
	} catch (error) {
		console.error("Error adding item to DynamoDB", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error adding item to inventory" }),
		};
	}
};
