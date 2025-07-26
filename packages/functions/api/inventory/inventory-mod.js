import { save, findAll } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { get as getProduct, updateItemPricing, updateProductTableStockAndPrice } from ".";

const ItemSchema = z.object({
	id: z.string(),
	itemCode: z.string(),
	name: z.string(),
	stock: z.number(), // allow decimals
	currentCompareAtPrice: z.number(),
	currentOnlineStorePrice: z.number(),
	adjustQuantity: z.number(), // allow decimals
	newPurchasingPrice: z.number().positive(),
	newOnlineStorePrice: z.number().positive(),
	overallStock: z.number().optional().nullable(),
	overallStockUnit: z.string().optional().nullable(),
	totalQuantityInB2c: z.number().optional().nullable(),
	totalquantityB2cUnit: z.string().optional().nullable(),
	amount: z.number().optional().nullable(), // renamed from wastageAmount
	image: z.string().optional().nullable(), // allow image field
});

const RequestBodySchema = z.object({
	reason: z.string(),
	description: z.string(),
	location: z.string(),
	image: z.string().optional().nullable(), // allow image at adjustment level
	items: z.array(ItemSchema),
});

export const add = middy(async (event) => {
	const req = JSON.parse(event.body);
	const id = Math.floor(Date.now() / 1000) % 100000;
	// Adjust adjustQuantity sign based on reason
	const items = req.items.map(item => {
		let adjustQuantity = Number(parseFloat(item.adjustQuantity));
		if (req.reason.toLowerCase() === 'damage' ) {
			adjustQuantity = -Math.abs(adjustQuantity);
		}
		if (req.reason.toLowerCase() === 'procure' ) {
			adjustQuantity = Math.abs(adjustQuantity);
		}
		// Calculate amount if not provided
		const amount = item.amount !== undefined && item.amount !== null
			? item.amount
			: (item.currentCompareAtPrice && adjustQuantity ? item.currentCompareAtPrice * adjustQuantity : null);
		return { ...item, adjustQuantity, amount };
	});
	const item = {
		id: id.toString(),
		reason: req.reason,
		description: req.description,
		date: new Date().toISOString(),
		// adjustedBy -- TODO
		location: req.location,
		image: req.image ?? null,
		items: JSON.stringify(items),
	};
	await save(Table.inventoryModificationTable.tableName, item);
	await Promise.all(items.map(async (item) => {
		await updateItemPricing(item); // inventoryTable
		await updateProductTableStockAndPrice(item); // productsTable
	}));
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item added successfully" }),
	};
})
	.use(bodyValidator(RequestBodySchema))
	.use(errorHandler());

export const list = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	const data = await findAll(
		Table.inventoryModificationTable.tableName,
		nextKey,
		"createdAtIndex"
	);
	const res = data.items.map((item) => {
		return {
			id: item.id,
			reason: item.reason,
			description: item.description,
			date: item.date,
			// adjustedBy -- TODO
			location: item.location,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt,
			items: JSON.parse(item.items),
		};
	});
	return {
		statusCode: 200,
		body: JSON.stringify({
			count: data.count,
			items: res,
			nextKey: data.nextKey,
		}),
	};
}).use(errorHandler());

export const getById = middy(async (event) => {
	const id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Adjustment id is required" }),
		};
	}
	const data = await findAll(Table.inventoryModificationTable.tableName);
	const found = data.items.find((item) => item.id === id);
	if (!found) {
		return {
			statusCode: 404,
			body: JSON.stringify({ message: "Adjustment not found" }),
		};
	}
	const parsedItems = JSON.parse(found.items).map((item) => ({
		...item,
		amount: item.amount !== undefined ? item.amount : (item.currentCompareAtPrice && item.adjustQuantity ? item.currentCompareAtPrice * item.adjustQuantity : null)
	}));
	return {
		statusCode: 200,
		body: JSON.stringify({
			id: found.id,
			reason: found.reason,
			description: found.description,
			date: found.date,
			location: found.location,
			items: parsedItems,
		}),
	};
}).use(errorHandler());

export { getById as getAdjustmentByIdHandler };

export const updateById = middy(async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Adjustment id is required" }),
    };
  }
  const req = JSON.parse(event.body);
  // Find the existing adjustment
  const data = await findAll(Table.inventoryModificationTable.tableName);
  const found = data.items.find((item) => item.id === id);
  if (!found) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Adjustment not found" }),
    };
  }
  // Parse old and new items
  const oldItems = JSON.parse(found.items);
  const newItems = (req.items || []).map(item => {
    let adjustQuantity = Number(parseFloat(item.adjustQuantity));
    if (req.reason && req.reason.toLowerCase() === 'damage' ) {
      adjustQuantity = -Math.abs(adjustQuantity);
    }
    if (req.reason && req.reason.toLowerCase() === 'procure' ) {
      adjustQuantity = Math.abs(adjustQuantity);
    }
    // Calculate amount if not provided
    const amount = item.amount !== undefined && item.amount !== null
      ? item.amount
      : (item.currentCompareAtPrice && adjustQuantity ? item.currentCompareAtPrice * adjustQuantity : null);
    return { ...item, adjustQuantity, amount };
  });

  // 1. Reverse the effect of all old adjustments
  await Promise.all(oldItems.map(async (item) => {
    // Reverse: add back the old adjustment
    const reverseItem = {
      ...item,
      adjustQuantity: -item.adjustQuantity,
      amount: item.amount !== undefined ? -item.amount : (item.currentCompareAtPrice * -item.adjustQuantity),
    };
    await updateItemPricing(reverseItem);
    await updateProductTableStockAndPrice(reverseItem);
  }));

  // 2. Apply all new adjustments (including new items)
  await Promise.all(newItems.map(async (item) => {
    // Ensure amount is recalculated if not provided
    const adj = {
      ...item,
      amount: item.amount !== undefined ? item.amount : (item.currentCompareAtPrice * item.adjustQuantity),
    };
    await updateItemPricing(adj);
    await updateProductTableStockAndPrice(adj);
  }));

  // 3. Update the adjustment record
  const updatedAdjustment = {
    ...found,
    reason: req.reason ?? found.reason,
    description: req.description ?? found.description,
    location: req.location ?? found.location,
    image: req.image ?? found.image ?? null,
    date: found.date,
    items: JSON.stringify(newItems),
    updatedAt: new Date().toISOString(),
  };
  await save(Table.inventoryModificationTable.tableName, updatedAdjustment);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Adjustment updated successfully",
      adjustment: {
        ...updatedAdjustment,
        items: newItems,
      },
    }),
  };
}).use(errorHandler());

export { updateById as updateAdjustmentByIdHandler };
