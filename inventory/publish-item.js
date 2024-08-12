require("dotenv").config();
const { findById, save } = require("../common/data");
// const z = require("zod");

// const idSchema = z.string.uuid({ message: "invalid id" });

module.exports.handler = async (event) => {
	const id = event.pathParameters.id;
	// const res = idSchema.safeParse(id);
	// if (!parseRes.success) {
	// const errorMessage = parseRes.error.errors[0].message;
	// return {
	// statusCode: 400,
	// body: JSON.stringify({ message: errorMessage }),
	// };
	// }
	try {
		data = await findById("Inventory", id);
		const res = await save("Products", data);
		return {
			statusCode: 200,
			body: JSON.stringify({ message: res }),
		};
	} catch (error) {
		console.error("Error adding item to DynamoDB", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error adding item to inventory" }),
		};
	}
};
