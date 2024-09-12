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
		body: JSON.stringify(data),
	};
}).use(errorHandler());
