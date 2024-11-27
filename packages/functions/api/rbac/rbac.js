import middy from "@middy/core";
import z from "zod";
import {
	changeActiveStatus,
	createNewUser,
	getUser,
	listUsers,
	searchByName,
} from ".";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

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

export const listUsersHandler = middy(async (event) => {
	let search = event.queryStringParameters?.search || undefined;
	let active = event.queryStringParameters?.active || undefined;
	let role = event.queryStringParameters?.role || undefined;
	if (search) {
		return await searchByName(search);
	}
	return await listUsers(active, role);
}).use(errorHandler());

const activeStatusSchema = z.object({
	id: z.string(),
	active: z.boolean(),
});

export const changeActiveStatusHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeActiveStatus(req);
})
	.use(bodyValidator(activeStatusSchema))
	.use(errorHandler());

export const getUserHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	return await getUser(id);
}).use(errorHandler());
