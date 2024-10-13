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
		return response.json();
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
			`${FACEBOOK_GRAPH_API_URL}}/${CATALOG_ID}/products`,
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
		console.log(data);
		return response;
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
		console.log(data);
		return response;
	} catch (error) {
		console.error(
			"Error updating product in Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function fetchProducts(event) {
	console.log(JSON.stringify(event, null, 2));
	try {
		const response = await ky.get(API_URL); // Perform GET request
		const product = await response.json();

		const variants = [];
		console.log("products :", product);

		// Handling products with unitPrices
		if (
			product.unit === "kgs" &&
			product.unitPrices &&
			product.unitPrices.length > 0
		) {
			for (const unitPrice of product.unitPrices) {
				const variant = {
					retailer_id: product.id,
					availability: "in stock",
					brand: product.brand || "Default Brand",
					category: product.category.toLowerCase(),
					subcategory: product.subCategory || "",
					description:
						product.description || "Fresh Fruits and vegetables",
					url: product.image,
					image_url: product.image,
					name: `${product.name} - ${unitPrice.qty} kg`,
					price: (unitPrice.price * 100).toFixed(0), // Fallback to main product price
					currency: product.currency || "INR",
					options: [{ name: "Weight", value: `${unitPrice.qty} kg` }],
					productIDForEcom: product.id,
				};
				variants.push(variant);
				console.log(variant);
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
					product.description || "Fresh Fruits and vegetables",
				image_url: product.image,
				url: product.image,
				name: product.name,
				price: (product.unitPrices.price * 100).toFixed(0),
				currency: product.currency || "INR",
				options: [{ name: "Quantity", value: "1 Piece" }],
				productIDForEcom: product.id,
			};
			variants.push(variant);
			console.log(variant);
		}
		// Create or Update each variant in Facebook Commerce Manager
		if (variants.length > 0) {
			for (const variant of variants) {
				const existingProducts = await getProductFromCommerceManager();
				console.log("existingProducts : ", existingProducts);
				console.log(variant.retailer_id);
				const existingProduct = existingProducts.data.find(
					(product) => product.retailer_id === variant.retailer_id
				);
				console.log(variant);
				if (existingProduct) {
					const updateFbData = {
						// Add any properties you want to update here
						name: variant.name,
						price: variant.price,
						availability: variant.availability,
						currency: variant.currency,
						// Include other fields as necessary
					};
					await updateProductInCommerceManager(
						existingProduct,
						updateFbData
					);
					console.log("update 1");
				} else {
					console.log("create 1");
					await createProductInCommerceManager(variant);
				}
			}
		} else {
			console.log("No variants to upload.");
		}
	} catch (error) {
		console.error("Error fetching products:", error);
	}
}

// Execute the function to fetch the first product and create/update it in Commerce Manager
// fetchProducts();

export const handler = EventHandler(Events.PriceUpdate, async (evt) => {
	fetchProducts(evt);
});
