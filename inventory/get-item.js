require("dotenv").config();
const { findById } = require("../common/data");

module.exports.handler = async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	try {
		const data = await findById("Inventory", id);
		return {
			statusCode: 200,
			body: JSON.stringify(data),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
