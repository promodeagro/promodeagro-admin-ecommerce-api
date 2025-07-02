import AWS from "aws-sdk";
import middy from "@middy/core";
import { updateItem } from ".";
import { errorHandler } from "../util/errorHandler";
import { parse } from "lambda-multipart-parser"; // For parsing multipart form-data
import { read, readFile, utils } from "xlsx";

export const handler = middy(async (event) => {
    try {
        const parsedData = await parse(event);
        console.log(parsedData)
        // Extract the file from the parsed data
        const file = parsedData.files[0];
        if (!file) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No file uploaded" }),
            };
        }
    
        // S3 bucket details
        const workbook = read(file.content, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];

        // Convert first sheet to JSON
        const jsonData = utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Iterate through each row and update items
        for (const row of jsonData) {
            const productId = row.ID;
            if (!productId) continue; // Skip if ID is missing

            const updateData = {
                name: row.NAME,
                description: row.DESCRIPTION,
                category: row.CATEGORY,
                subCategory: row.SUBCATEGORY,
                units: row.UNITS.toLowerCase(),
                // expiry: row.EXPIRY ? new Date(row.EXPIRY).toISOString() : undefined,
                availability: row.AVAILABILITY,
                sellingPrice: row.SELLINGPRICE,
                discount: row.DISCOUNT,
                purchasingPrice: row.PURCHASINGPRICE,
                stockQuantity: row.STOCKQUANTITY,
                stockQuantityAlert: row.STOCKQUANTITYALERT,
                comparePrice: row.COMPAREPRICE,
                isVariant: row.ISVARIANT,
                minimumSellingWeight: row.MINIMUMSELLINGWEIGHT,
                minimumSellingWeightUnit: row.MINIMUMSELLINGWEIGHTUNIT,
                maximumSellingWeight: row.MAXIMUMSELLINGWEIGHT,
                maximumSellingWeightUnit: row.MAXIMUMSELLINGWEIGHTUNIT,
                buyerLimit: row.BUYERLIMIT,
                tags: row.TAGS ? row.TAGS.split(",") : [],
                searchName: row.SEARCH_NAME,
                totalQuantityInB2C: row.TOTALQUANTITYINB2C,
                images: row.IMAGES ? JSON.parse(row.IMAGES) : [],
                image: row.IMAGE,
                createdAt: row.CREATEDAT ? new Date(row.CREATEDAT).toISOString() : undefined,
                updatedAt: new Date().toISOString(),
            };

            // Update the item in DynamoDB
            await updateItem(productId, updateData);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Products updated successfully" }),
        };
    } catch (error) {
        console.error("Error processing file:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
}).use(errorHandler());
