import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { bodyValidator } from "../util/bodyValidator";
import { Table } from "sst/node/table";
import z from "zod";
import { standardizeVariantUnits, standardizeAttributeUnits } from "./unitUtils";
import { save } from "../../common/data";

const updateGroupSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional().nullable(),
      attribute: z.string().optional().nullable(),
      purchasingPrice: z.number().nonnegative().optional().nullable(),
      sellingPrice: z.number().nonnegative().optional().nullable(),
      comparePrice: z.number().nonnegative().optional().nullable(),
      lowStockAlert: z.number().nonnegative().optional().nullable(),
      availability: z.boolean().optional().nullable(),
      unit: z.string().optional().nullable(),
      totalQuantityInB2c: z.number().nonnegative().optional().nullable(),
      totalquantityB2cUnit: z.string().optional().nullable(),
      expiry: z.string().optional().nullable(),
      images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional().nullable(),
      tags: z.array(z.string()).optional().nullable(),
      description: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      subCategory: z.string().optional().nullable(),
      overallStock: z.number().nonnegative().optional().nullable(),
      overallStockUnit: z.string().optional().nullable(),
    })
  ).optional(),
  add: z.array(
    z.object({
      attribute: z.string().optional().nullable(),
      purchasingPrice: z.number().nonnegative().optional().nullable(),
      sellingPrice: z.number().nonnegative().optional().nullable(),
      comparePrice: z.number().nonnegative().optional().nullable(),
      lowStockAlert: z.number().nonnegative().optional().nullable(),
      availability: z.boolean().optional().nullable(),
      unit: z.string().optional().nullable(),
      totalQuantityInB2c: z.number().nonnegative().optional().nullable(),
      totalquantityB2cUnit: z.string().optional().nullable(),
      expiry: z.string().optional().nullable(),
      images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional().nullable(),
      name: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      subCategory: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      tags: z.array(z.string()).optional().nullable(),
    })
  ).optional(),
});

export const handler = middy(async (event) => {
  try {
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "groupId is required" })
      };
    }
    const req = JSON.parse(event.body);
    const { updates = [], add = [] } = req;
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
    const client = new DynamoDBClient({ region: "ap-south-1" });
    const docClient = DynamoDBDocumentClient.from(client);
    const productsTable = Table.productsTable.tableName;

    // Fetch all items in the group
    const scanParams = {
      TableName: productsTable,
      FilterExpression: "groupId = :groupId",
      ExpressionAttributeValues: { ":groupId": groupId }
    };
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const items = scanResult.Items || [];
    if (items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No items found for groupId" })
      };
    }
    // Use the first item as the group-level source
    const groupSource = items[0];

    // 1. Update existing variants
    const updatedIds = [];
    // Check if any update is for overallStock or overallStockUnit at the group level
    let groupLevelOverallStock = null;
    let groupLevelOverallStockUnit = null;
    for (const update of updates) {
      if (update.id === 'group' && (update.overallStock !== undefined || update.overallStockUnit !== undefined)) {
        if (update.overallStock !== undefined) groupLevelOverallStock = update.overallStock;
        if (update.overallStockUnit !== undefined) groupLevelOverallStockUnit = update.overallStockUnit;
      }
    }
    // If group-level overallStock/unit is being updated, propagate to all items in the group
    if (groupLevelOverallStock !== null || groupLevelOverallStockUnit !== null) {
      for (const item of items) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        if (groupLevelOverallStock !== null) {
          updateExpressions.push('#overallStock = :overallStock');
          expressionAttributeNames['#overallStock'] = 'overallStock';
          expressionAttributeValues[':overallStock'] = groupLevelOverallStock;
        }
        if (groupLevelOverallStockUnit !== null) {
          updateExpressions.push('#overallStockUnit = :overallStockUnit');
          expressionAttributeNames['#overallStockUnit'] = 'overallStockUnit';
          expressionAttributeValues[':overallStockUnit'] = groupLevelOverallStockUnit;
        }
        if (updateExpressions.length > 0) {
          const updateParams = {
            TableName: productsTable,
            Key: { id: item.id },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
          };
          await docClient.send(new UpdateCommand(updateParams));
          updatedIds.push(item.id);
        }
      }
    }
    // Now process normal variant updates as before
    for (const update of updates) {
      if (update.id === 'group') continue; // Already handled above
      const variant = items.find(item => item.id === update.id);
      if (!variant) continue;
      // Only update provided fields
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      Object.entries(update).forEach(([key, value], idx) => {
        if (key === 'id') return;
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[':' + key] = value;
      });
      if (updateExpressions.length === 0) continue;
      const updateParams = {
        TableName: productsTable,
        Key: { id: update.id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      };
      await docClient.send(new UpdateCommand(updateParams));
      updatedIds.push(update.id);
    }

    // 2. Add new variants
    const addedIds = [];
    for (const newVariant of add) {
      // Standardize and inherit fields
      let standardized = standardizeVariantUnits([newVariant])[0];
      standardized.attribute = standardizeAttributeUnits(standardized.attribute);
      // Use groupSource for group-level fields if not provided
      const name = newVariant.name || groupSource.name;
      const category = newVariant.category || groupSource.category;
      const subCategory = newVariant.subCategory || groupSource.subCategory;
      const description = newVariant.description || groupSource.description;
      const tags = newVariant.tags || groupSource.tags || [];
      const images = newVariant.images || groupSource.images || [];
      const expiry = newVariant.expiry || groupSource.expiry;
      const variantId = Math.floor(Math.random() * 10000000000).toString();
      const discountPercentage = standardized.comparePrice > 0
        ? ((standardized.comparePrice - standardized.sellingPrice) / standardized.comparePrice) * 100
        : 0;
      const variantItem = {
        id: variantId,
        groupId: groupId,
        // parentProductId: groupSource.id, // Remove if not used in your schema
        availability: standardized.availability,
        name,
        search_name: name.toLowerCase(),
        expiry,
        category,
        subCategory,
        isVariant: true,
        tags,
        description,
        images,
        image: images[0] || "",
        units: standardized.unit,
        totalQuantityInB2c: standardized.totalQuantityInB2c,
        totalquantityB2cUnit: standardized.totalquantityB2cUnit,
        stockQuantity: standardized.stockQuantity, // Use provided or null
        stockQuantityAlert: standardized.lowStockAlert,
        purchasingPrice: standardized.purchasingPrice,
        sellingPrice: standardized.sellingPrice,
        comparePrice: standardized.comparePrice,
        discount: discountPercentage.toFixed(2),
        overallStock: groupSource.overallStock || 0, // Reference shared stock
        overallStockUnit: groupSource.overallStockUnit,
        attribute: standardized.attribute,
        useSharedStock: true,
      };
      await save(productsTable, variantItem);
      addedIds.push(variantId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        updated: updatedIds,
        added: addedIds,
        groupId
      })
    };
  } catch (error) {
    console.error("Error updating group:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
})
  .use(bodyValidator(updateGroupSchema))
  .use(errorHandler()); 