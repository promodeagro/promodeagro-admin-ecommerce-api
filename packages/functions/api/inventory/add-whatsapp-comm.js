import { EventHandler } from "sst/node/event-bus";
import ky from "ky";
import { Events } from "./events";
import { Config } from "sst/node/config";
import crypto from "crypto";
import { findById, update } from "../../common/data";
import { Table } from "sst/node/table";

const API_URL = Config.API_URL;
const FACEBOOK_ACCESS_TOKEN = Config.FACEBOOK_ACCESS_TOKEN;
const CATALOG_ID = Config.CATALOG_ID;
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com/v18.0";

// Function to fetch all products from Facebook Commerce Manager
async function getProductsFromCommerceManager() {
	try {
		const response = await ky.get(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products`, {
			searchParams: {
				access_token: FACEBOOK_ACCESS_TOKEN,
			},
		});
		return await response.json();
	} catch (error) {
		console.error("Error fetching product from Commerce Manager:", error.message);
		throw error;
	}
}

// Function to create a new product variant in Facebook Commerce Manager
async function createProductInCommerceManager(variant) {
	try {
		const response = await ky.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products`, {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				...variant,
				access_token: FACEBOOK_ACCESS_TOKEN,
			}),
		});
		const data = await response.json();
		console.log("Created product:", data);
		return data;
	} catch (error) {
		console.error("Error creating product in Commerce Manager:", error.message);
		throw error;
	}
}

// Function to update an existing product in Facebook Commerce Manager
async function updateProductInCommerceManager(productData, updateFbData) {
	try {
		const productUpdate = {
			access_token: FACEBOOK_ACCESS_TOKEN,
			requests: [
				{
					method: "UPDATE",
					retailer_id: productData.retailer_id,
					data: updateFbData,
				},
			],
		};

		const response = await ky.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`, {
			headers: {
				"Content-Type": "application/json",
			},
			json: productUpdate,
		});

		console.log(FACEBOOK_ACCESS_TOKEN);
		console.log(CATALOG_ID);
		const data = await response.json();
		console.log("Updated product:", data);
		return data;
	} catch (error) {
		console.error("Error updating product in Commerce Manager:", error.message);
		throw error;
	}
}

// Main function to process product updates
async function fetchProducts(event) {
	console.log("Received event:", JSON.stringify(event, null, 2));
	try {
		const productId = event.properties[0].id;
		const response = await ky.get(`${API_URL}${productId}`);
		const product = await response.json(); // Assuming the response contains a single product
		// console.log("Fetched product:", product);

		const variants = [];
		if (Array.isArray(product.unitPrices)) {
			for (const unitPrice of product.unitPrices) {

				console.log(unitPrice)
				let variantId = unitPrice.varient_id;
				const variant = {
					itemCode: product.itemCode,
					availability: "in stock",
					brand: product.brand || "Default Brand",
					category: product.category.toLowerCase(),
					subcategory: product.subCategory || "",
					description: product.description || "Fresh Fruits and Vegetables",
					url: product.image,
					image_url: product.image,
					name: `${product.name} - ${unitPrice.qty} ${product.unit}`,
					price: (unitPrice.price * 100).toFixed(0), // Convert price to cents/paise
					currency: product.currency || "INR",
					options: [{ name: "Weight", value: `${unitPrice.qty} ${product.unit}` }],
					retailer_id: variantId,
					unitPrices: product.unitPrices,
				};

				variants.push(variant);
			}
		}

		const existingProducts = await getProductsFromCommerceManager();
		console.log("Existing products:", existingProducts);

		for (const variant of variants) {
			const existingProduct = existingProducts.data.find(
				(p) => p.retailer_id === variant.retailer_id
			);
			console.log(existingProduct)
			console.log(variant.retailer_id)


			if (existingProduct) {
				const updateFbData = {
					name: variant.name,
					price: variant.price,
					availability: variant.availability,
					currency: variant.currency,
				};
				await updateProductInCommerceManager(existingProduct, updateFbData);
				console.log(`Product ${variant.retailer_id} updated in Commerce Manager.`);
			} else {
				await createProductInCommerceManager(variant);
				console.log(`Product ${variant.retailer_id} created in Commerce Manager.`);
			}
		}
	} catch (error) {
		console.error("Error fetching products:", error);
	}
}

// Event handler for product price updates
export const handler = EventHandler(Events.PriceUpdate, async (evt) => {
	// await fetchProducts(evt);
});
