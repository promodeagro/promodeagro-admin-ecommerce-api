import crypto from "crypto";
import { save } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
  standardizeUnits,
  standardizeVariantUnits,
  standardizeAttributeUnits
} from "./unitUtils";

// Schema for the request body
const addVariantSchema = z.object({
  groupId: z.string(),
  parentProductId: z.string(),
  attribute: z.string(),
  purchasingPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  comparePrice: z.number().nonnegative(),
  lowStockAlert: z.number().nonnegative(),
  availability: z.boolean(),
  unit: z.string(),
  totalQuantityInB2c: z.number().nonnegative().optional(),
  totalquantityB2cUnit: z.string().optional(),
  stockQuantity: z.number().nonnegative().optional(),
  expiry: z.string().optional(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
  name: z.string().optional(), // fallback if needed
  category: z.string().optional(),
  subCategory: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const handler = middy(async (event) => {
  try {
    const req = JSON.parse(event.body);
    // Validate and standardize units
    const standardizedVariant = standardizeVariantUnits([
      req
    ])[0];
    standardizedVariant.attribute = standardizeAttributeUnits(standardizedVariant.attribute);

    // Fetch parent product to get group info and shared fields
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, ScanCommand, GetCommand } = await import("@aws-sdk/lib-dynamodb");
    const client = new DynamoDBClient({ region: "ap-south-1" });
    const docClient = DynamoDBDocumentClient.from(client);
    const productsTable = Table.productsTable.tableName;

    // 1. Check groupId exists and get parent product
    const scanParams = {
      TableName: productsTable,
      FilterExpression: "groupId = :groupId",
      ExpressionAttributeValues: { ":groupId": req.groupId }
    };
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    if (!scanResult.Items || scanResult.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "GroupId not found" })
      };
    }
    // Find parent product
    const parentProduct = scanResult.Items.find(item => item.isParentProduct);
    if (!parentProduct || parentProduct.id !== req.parentProductId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Parent product not found in group" })
      };
    }

    // Use parent fields if not provided in request
    const name = req.name || parentProduct.name;
    const category = req.category || parentProduct.category;
    const subCategory = req.subCategory || parentProduct.subCategory;
    const description = req.description || parentProduct.description;
    const tags = req.tags || parentProduct.tags || [];
    const images = req.images || parentProduct.images || [];
    const expiry = req.expiry || parentProduct.expiry;

    // Create new variant item
    const variantId = Math.floor(Math.random() * 10000000000).toString();
    const discountPercentage = standardizedVariant.comparePrice > 0
      ? ((standardizedVariant.comparePrice - standardizedVariant.sellingPrice) / standardizedVariant.comparePrice) * 100
      : 0;
    const variantItem = {
      id: variantId,
      groupId: req.groupId,
      parentProductId: req.parentProductId,
      availability: standardizedVariant.availability,
      name,
      search_name: name.toLowerCase(),
      expiry,
      category,
      subCategory,
      isVariant: true,
      isParentProduct: false,
      tags,
      description,
      images,
      image: images[0] || "",
      units: standardizedVariant.unit,
      totalQuantityInB2c: standardizedVariant.totalQuantityInB2c,
      totalquantityB2cUnit: standardizedVariant.totalquantityB2cUnit,
      stockQuantity: null, // Variants use shared stock
      stockQuantityAlert: standardizedVariant.lowStockAlert,
      purchasingPrice: standardizedVariant.purchasingPrice,
      sellingPrice: standardizedVariant.sellingPrice,
      comparePrice: standardizedVariant.comparePrice,
      discount: discountPercentage.toFixed(2),
      overallStock: parentProduct.overallStock || 0, // Reference shared stock
      overallStockUnit: parentProduct.overallStockUnit,
      attribute: standardizedVariant.attribute,
      useSharedStock: true,
    };
    await save(productsTable, variantItem);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Variant added successfully", variantId, groupId: req.groupId })
    };
  } catch (error) {
    console.error("Error adding variant:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
})
  .use(bodyValidator(addVariantSchema))
  .use(errorHandler()); 