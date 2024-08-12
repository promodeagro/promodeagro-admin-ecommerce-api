require("dotenv").config();
const crypto = require("crypto");
const { save } = require("../common/data");
const z = require("zod");

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
	const uuid = crypto.randomUUID();
	const itemCode = uuid.split("-")[0];
	const item = {
		id: uuid,
		itemCode,
		name: req.name,
		description: req.description,
		category: req.category,
		units: req.units,
		purchasingPrice: Number(req.purchasingPrice),
		msp: Number(req.msp),
		active: false,
		stockQuantity: Number(req.stockQuantity),
		expiry: req.expiry,
		updatedAt: new Date().toISOString(),
		images: req.images || [],
	};
	try {
		await save(process.env.INVENTORY_TABLE, item);
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
