import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { checkQuery } from "./get-orders";
import { listOrdersInventory } from ".";
import { z } from "zod";
import { queryParamsValidator } from "../util/queryParamsValidator";

// const typeQuerySchema = z
// 	.object({
// 		type: z.enum(["cash", "online"]),
// 	})
// 	.optional();

export const handler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let type = event.queryStringParameters?.type || undefined;
	let date = event.queryStringParameters?.date || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let shift = event.queryStringParameters?.shift || undefined;
	let pincode = event.queryStringParameters?.pincode || undefined;
	let search = event.queryStringParameters?.search || undefined;
	let data = {};
	if (search) {
		data.items = await checkQuery(search);
	} else {
		data = await listOrdersInventory(
			type,
			date,
			status,
			shift,
			pincode,
			nextKey
		);

		console.log(data)
	}
	const itemsArray = Array.isArray(data.items) ? data.items : [data.items];
	const res = itemsArray.map((item) => {
		return {
			id: item.id,
			orderDate: item.createdAt,
			customerName: item.customerName,
			items: item.items.length,
			paymentStatus: item.paymentDetails?.status || undefined,
			paymentType: item.paymentDetails?.method || undefined,
			orderStatus: item.status,
			totalAmount: item.totalPrice,
			deliverySlot: item.deliverySlot || {},
			assignee: item?.assigned || undefined,
			statusDetails: item?.statusDetails || {},
			area: item.address.address,
			cancellationData: item.cancellationData || {},
			finalTotal: item.finalTotal,
			deliveryCharges: item.deliveryCharges || 0

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
})
	// .use(queryParamsValidator(typeQuerySchema))
	.use(errorHandler());
