import { createEventBuilder, ZodValidator } from "sst/node/event-bus";
import { reqSchmea } from "./update-item-price";
import z from "zod";

export const event = createEventBuilder({
	bus: "bus",
	validator: ZodValidator,
});

export const Events = {
	PriceUpdate: event(
		"Product.PriceUpdate",
		z.array(
			z
				.object({
					id: z.string(),
					compareAt: z.number().positive(),
					onlineStorePrice: z.number().positive(),
				})
				.refine((ob) => ob.compareAt > ob.onlineStorePrice, {
					message: "compareAt must be greater than onlineStorePrice",
				})
		)
	),
};
