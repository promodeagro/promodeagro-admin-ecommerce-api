import z from "zod";
import { findById, update } from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { Events } from "./events";

export const reqSchmea = z.array(
	z
		.object({
			id: z.string(),
			compareAt: z.number().positive(),
			onlineStorePrice: z.number().positive(),
		})
		.refine((ob) => ob.compareAt > ob.onlineStorePrice, {
			message: "compareAt must be greater than onlineStorePrice",
		})
);
export const handler = middy(async (event) => {
	console.log(1);
	const req = JSON.parse(event.body);
	console.log(2);
	await Promise.all(
		req.map(async (item) => {
			const product = await findById(
				Table.productsTable.tableName,
				item.id
			);
			return update(
				Table.inventoryTable.tableName,
				{ id: product.itemCode },
				{
					compareAt: item.compareAt,
					onlineStorePrice: item.onlineStorePrice,
					unitPrices: calculateUnitPrices(
						product.unit,
						item.onlineStorePrice,
						item.compareAt
					),
				}
			);
		})
	);
	console.log(3);
	await Events.PriceUpdate.publish(req);
	console.log(4);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "success" }),
	};
})
	.use(bodyValidator(reqSchmea))
	.use(errorHandler());

function calculateUnitPrices(units, price, savings) {
	const prices = [];
	const diffUnits = [250, 500, 1000];
	if (units === "grams") {
		for (const unit of diffUnits) {
			const unitPrice = Math.round((unit / 1000) * price);
			const unitCompareAt = Math.round((unit / 1000) * savings);
			const discountedSavings = Math.abs(unitPrice - unitCompareAt);
			prices.push({
				qty: unit,
				mrp: unitCompareAt,
				savings: discountedSavings,
				price: unitPrice,
			});
		}
	} else {
		prices.push({
			qty: 1,
			price: price,
			savings: Math.abs(price - savings),
			discountedPrice: Math.abs(price - savings),
		});
	}
	return prices;
}
