const { DynamoDB } = require('aws-sdk');
const dynamodb = new DynamoDB.DocumentClient();
import { list } from ".";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";

export const handler = middy(async (event) => {
    try {
        // Get the nextKey from query parameters if it exists
        const { nextKey } = event.queryStringParameters || {};

        const result = await list(nextKey);

        if (!result.items || !Array.isArray(result.items)) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    count: 0,
                    items: [],
                    nextKey: null
                })
            };
        }

        // Group products by groupId
        const groupedProducts = result.items.reduce((acc, item) => {
            if (!item) return acc;

            const groupId = item.groupId || item.id;

            if (!acc[groupId]) {
                // Initialize group with common properties
                acc[groupId] = {
                    groupId,
                    name: item.name,
                    category: item.category,
                    subCategory: item.subCategory,
                    description: item.description,
                    image: item.image,
                    images: item.images || [],
                    tags: item.tags || [],
                    variations: []
                };
            }

            // Add all original item properties to variations
            acc[groupId].variations.push({
                ...item
            });

            return acc;
        }, {});

        // Convert grouped products object to array
        const products = Object.values(groupedProducts);

        return {
            statusCode: 200,
            body: JSON.stringify({
                count: products.length,
                items: products,
                nextKey: result.nextKey || null
            })
        };

    } catch (error) {
        console.error('Error:', error);
        throw error; // Let the errorHandler middleware handle the error
    }
}).use(errorHandler());