import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { list } from ".";

export const listHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}

	return await list(id);
}).use(errorHandler());
