const { DynamoDB } = require('aws-sdk');
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";

const dynamodb = new DynamoDB.DocumentClient();
import { Table } from "sst/node/table";


const productsTable = Table.productsTable.tableName;


export const handler = middy(async (event) => {
    try {
        // Scan the entire products table
        const params = {
            TableName: productsTable
        };

        const scanResults = [];
        let items;

        do {
            items = await dynamodb.scan(params).promise();
            items.Items.forEach((item) => scanResults.push(item));
            params.ExclusiveStartKey = items.LastEvaluatedKey;
        } while (typeof items.LastEvaluatedKey !== "undefined");

        if (!scanResults.length) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    categories: []
                })
            };
        }

        // Sort items to keep same groupId products together
        const sortedItems = scanResults.sort((a, b) => {
            const groupIdA = a.groupId || a.id;
            const groupIdB = b.groupId || b.id;
            return groupIdA.localeCompare(groupIdB);
        });

        // Organize by category and subcategory
        const categorizedProducts = sortedItems.reduce((acc, product) => {
            if (!product) return acc;

            const category = product.category || 'Uncategorized';
            const subCategory = product.subCategory || 'General';

            // Initialize category if it doesn't exist
            if (!acc[category]) {
                acc[category] = {
                    name: category,
                    subCategories: {}
                };
            }

            // Initialize subcategory if it doesn't exist
            if (!acc[category].subCategories[subCategory]) {
                acc[category].subCategories[subCategory] = {
                    name: subCategory,
                    products: []
                };
            }

            // Add product to appropriate subcategory
            acc[category].subCategories[subCategory].products.push({
               product
            });

            return acc;
        }, {});

        // Transform the data structure for response
        const formattedCategories = Object.entries(categorizedProducts).map(([categoryName, categoryData]) => ({
            name: categoryName,
            subCategories: Object.entries(categoryData.subCategories).map(([subCategoryName, subCategoryData]) => ({
                name: subCategoryName,
                products: subCategoryData.products
            }))
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                categories: formattedCategories,
                totalCategories: formattedCategories.length,
                totalProducts: scanResults.length
            })
        };

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}).use(errorHandler());
