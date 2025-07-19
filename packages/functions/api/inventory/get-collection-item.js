const { DynamoDB } = require('aws-sdk');
const dynamodb = new DynamoDB.DocumentClient();
import { list, searchByName, searchByItemCode, inventoryByCategory } from ".";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";

export const handler = middy(async (event) => {
    try {
        // Ignore pagination/nextKey, fetch all items
        const search = event.queryStringParameters?.search || undefined;
        const category = event.queryStringParameters?.category || undefined;
        const subCategory = event.queryStringParameters?.subCategory || undefined;
        const active = event.queryStringParameters?.active || undefined;

        let allItems = [];
        let lastEvaluatedKey = undefined;
        let data = {};

        do {
            if (search) {
                const itemCodeRegex = /^[a-fA-F0-9]+$/;
                try {
                    if (itemCodeRegex.test(search)) {
                        data = await searchByItemCode(search);
                    } else {
                        data = await searchByName(search);
                    }
                } catch (err) {
                    if (err.name === "ValidationException") {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({
                                count: 0,
                                items: [],
                            })
                        };
                    }
                    throw err;
                }
                // For search, break after first fetch (searchByName/ItemCode returns all matches)
                allItems = data.items || [];
                break;
            } else if (category || active) {
                data = await inventoryByCategory(lastEvaluatedKey, category, subCategory, active);
            } else {
                data = await list(lastEvaluatedKey);
            }
            allItems = allItems.concat(data.items || []);
            lastEvaluatedKey = data.nextKey;
        } while (lastEvaluatedKey);

        // Group products by groupId
        const groupedProducts = allItems.reduce((acc, item) => {
            if (!item) return acc;
            const groupId = item.groupId || item.id;
            if (!acc[groupId]) {
                acc[groupId] = {
                    groupId,
                    name: item.name,
                    category: item.category,
                    subCategory: item.subCategory,
                    description: item.description,
                    image: item.image || (item.images && item.images[0]) || null,
                    images: item.images || [],
                    tags: item.tags || [],
                    overallStock: item.overallStock || null,
                    overallStockUnit: item.overallStockUnit || null,
                    expiry: item.expiry || null,
                    variations: []
                };
            }
            acc[groupId].variations.push({
                ...item,
                image: item.image || (item.images && item.images[0]) || null,
                images: item.images || [],
                overallStock: item.overallStock || null,
                overallStockUnit: item.overallStockUnit || null,
                expiry: item.expiry || null,
            });
            return acc;
        }, {});

        // Convert grouped products object to array
        const products = Object.values(groupedProducts).map(product => ({
            ...product,
            variantCount: product.variations.length
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                count: products.length,
                items: products
            })
        };

    } catch (error) {
        console.error('Error:', error);
        throw error; // Let the errorHandler middleware handle the error
    }
}).use(errorHandler());