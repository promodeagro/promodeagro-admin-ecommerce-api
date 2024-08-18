import crypto from "crypto";
import { save, productExistsByName } from "../../common/data";
import z from "zod";
import { Config } from "sst/node/config";

const inventoryItemSchema = z.object({
	name: z.string(),
	description: z.string(),
	category: z.string(),
	units: z.union([z.literal("pieces"), z.literal("grams")], {
		message: "units must be either 'pieces' or 'grams'",
	}),
	// units: z.enum(["pieces, grams"]),
	purchasingPrice: z.number().positive(),
	msp: z.number().positive(),
	stockQuantity: z.number().int().nonnegative(),
	expiry: z.string().datetime(),
	images: z.array(z.string().url()).min(1, "at least 1 image is required"),
});

export const handler = async (event) => {
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
	const exists = await productExistsByName(Config.INVENTORY_TABLE, req.name);
	console.log("exists :", exists);
	const uuid = crypto.randomUUID();
	const itemCode = uuid.split("-")[0].toUpperCase();
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
		// await save(Config.INVENTORY_TABLE, item);
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
