import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { get } from ".";

export const handler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const data = await get(id);
	return {
		statusCode: 200,
		body: JSON.stringify({
			...data,
			image: data.image || (data.images && data.images[0]) || null,
			images: data.images || [],
			overallStock: data.overallStock || null,
			overallStockUnit: data.overallStockUnit || null,
			expiry: data.expiry || null,
		}),
	};
}).use(errorHandler());
