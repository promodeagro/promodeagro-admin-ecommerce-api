import { EventHandler } from "sst/node/event-bus";
import ky from "ky";
import { Events } from "./events";
import { Config } from "sst/node/config";

const API_URL = Config.API_URL;
const FACEBOOK_ACCESS_TOKEN = Config.FACEBOOK_ACCESS_TOKEN;
const CATALOG_ID = Config.CATALOG_ID;
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com/v18.0";
async function getProductFromCommerceManager() {
	try {
		const response = await ky.get(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products`,
			{
				searchParams: {
					access_token: FACEBOOK_ACCESS_TOKEN,
				},
			}
		);
		return await response.json(); // Ensure you await the JSON parsing
	} catch (error) {
		console.error(
			"Error fetching product from Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function createProductInCommerceManager(variant) {
	try {
		const response = await ky.post(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products`, // Corrected URL
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					...variant,
					access_token: FACEBOOK_ACCESS_TOKEN,
				}),
			}
		);
		const data = await response.json();
		console.log("Created product:", data);
		return data;
	} catch (error) {
		console.error(
			"Error creating product in Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function updateProductInCommerceManager(productData, updateFbData) {
	try {
		const product = {
			access_token: FACEBOOK_ACCESS_TOKEN,
			requests: [
				{
					method: "UPDATE",
					retailer_id: productData.retailer_id,
					data: updateFbData,
				},
			],
		};

		const response = await ky.post(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`,
			{
				headers: {
					"Content-Type": "application/json",
				},
				json: product, // Sends JSON body automatically
			}
		);
		const data = await response.json();
		console.log("Updated product:", data);
		return data;
	} catch (error) {
		console.error(
			"Error updating product in Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function fetchProducts(event) {
	console.log("Received event:", JSON.stringify(event, null, 2));
	try {
		// Fetch products based on the event, using the event.id for filtering if necessary
		const response = await ky.get(`${API_URL}/${event.id}`);
		const product = await response.json() // Assuming the response contains multiple products

		const variants = [];
		console.log("Products:", products);

		// Iterate through all fetched products
			// Handling products with unitPrices (e.g., sold in KG)
			if (product.unit === "kgs" && Array.isArray(product.unitPrices)) {
				for (const unitPrice of product.unitPrices) {
					const variant = {
						retailer_id: product.id,
						availability: "in stock",
						brand: product.brand || "Default Brand",
						category: product.category.toLowerCase(),
						subcategory: product.subCategory || "",
						description:
							product.description || "Fresh Fruits and Vegetables",
						url: product.image,
						image_url: product.image,
						name: `${product.name} - ${unitPrice.qty} kg`,
						price: (unitPrice.price * 100).toFixed(0), // Price in cents/paise
						currency: product.currency || "INR",
						options: [{ name: "Weight", value: `${unitPrice.qty} kg` }],
						productIDForEcom: product.id,
					};
					variants.push(variant);
					console.log("Generated variant:", variant);
				}
			}
			// Handling products sold in pieces
			else if (product.unit === "pieces" || product.unit === "pcs") {
				const variant = {
					retailer_id: product.id,
					availability: "in stock",
					brand: product.brand || "Default Brand",
					category: product.category.toLowerCase(),
					subcategory: product.subCategory || "",
					description:
						product.description || "Fresh Fruits and Vegetables",
					image_url: product.image,
					url: product.image,
					name: product.name,
					price: product.unitPrices?.[0]?.price
						? (product.unitPrices[0].price * 100).toFixed(0)
						: "0", // Use first unitPrice if available, fallback to 0
					currency: product.currency || "INR",
					options: [{ name: "Quantity", value: "1 Piece" }],
					productIDForEcom: product.id,
				};
				variants.push(variant);
				console.log("Generated variant:", variant);
			}

			// Create or Update each variant in Facebook Commerce Manager
			for (const variant of variants) {
				const existingProducts = await getProductFromCommerceManager();
				console.log("Existing products:", existingProducts);

				// Check if the variant already exists by retailer_id
				const existingProduct = existingProducts.data.find(
					(product) => product.retailer_id === variant.retailer_id
				);

				// If the product exists, update it, otherwise create it
				if (existingProduct) {
					const updateFbData = {
						name: variant.name,
						price: variant.price,
						availability: variant.availability,
						currency: variant.currency,
					};
					await updateProductInCommerceManager(
						existingProduct,
						updateFbData
					);
					console.log(`Product ${variant.retailer_id} updated.`);
				} else {
					await createProductInCommerceManager(variant);
					console.log(`Product ${variant.retailer_id} created.`);
				}
			}
	} catch (error) {
		console.error("Error fetching products:", error);
	}
}

// Call the function with the relevant event
