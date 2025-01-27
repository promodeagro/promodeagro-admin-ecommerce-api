import { z } from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { reAttempt } from ".";



export const handler = middy(async (event) => {
    console.log(event)
	let id = event.pathParameters?.id;
	return await reAttempt(id);
})
	.use(errorHandler());
