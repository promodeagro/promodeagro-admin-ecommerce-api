import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { createNewUser } from ".";

const createAdminSchema = z.object({
	name: z.string(),
	email: z.string().email(),
	role: z.enum(["admin", "packer"]),
});

export const createNewUserHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await createNewUser(req);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "user created successfully",
		}),
	};
})
	.use(bodyValidator(createAdminSchema))
	.use(errorHandler());
