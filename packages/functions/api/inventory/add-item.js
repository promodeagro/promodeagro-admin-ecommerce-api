import crypto from "crypto";
import { save, itemExits } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { standardizeUnits, standardizeVariantUnits, standardizeAttributeUnits } from "./unitUtils";

export const categoriesWithSubcategories = {
  "Fresh Vegetables": [
    "Daily Vegetables",
    "Leafy Vegetables",
    "Exotic Vegetables",
  ],
  "Fresh Fruits": ["Daily Fruits", "Exotic Fruits", "Dry Fruits"],
  "Eggs Meat & Fish": ["Eggs", "Chicken", "Mutton", "Fish"],
  Dairy: ["Milk", "Butter & Ghee", "Paneer & Khowa"],
  Groceries: ["Cooking Oil", "Rice", "Daal", "Spices", "Snacks"],
  "Bengali Special": [
    "Bengali Vegetables",
    "Bengali Groceries",
    "Bengali Home Needs",
  ],
};

const variantSchema = z.object({
  attribute: z.string(),
  quantity: z.number().nonnegative().optional(),
  purchasingPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  comparePrice: z.number().nonnegative(),
  lowStockAlert: z.number().nonnegative(),
  availability: z.boolean(),
  unit: z.string(),
  totalQuantityInB2c: z.number().nonnegative().optional(),
  totalquantityB2cUnit: z.string().optional(),
  stockQuantity: z.number().nonnegative(),
  expiry: z.string().optional(),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed"),
});

const inventoryItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  quantity: z.number().nonnegative().optional(),
  category: z.string(),
  subCategory: z.string(),
  units: z.string(),
  availability: z.boolean(),
  purchasingPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  comparePrice: z.number().nonnegative(),
  stockQuantity: z.number().nonnegative(),
  stockQuantityAlert: z.number().nonnegative(),
  totalQuantityInB2c: z.number().nonnegative(),
  expiry: z.string(),
  totalquantityB2cUnit: z.string(),
  overallStock: z.number().nonnegative().optional(),
  overallStockUnit: z.string().optional(),
  images: z.array(z.string().url()).min(1, "At least 1 image is required"),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema).optional(),
});

export const handler = middy(async (event) => {
  try {
    const req = JSON.parse(event.body);
    const groupId = crypto.randomUUID();

    console.log("Checking if item exists:", req.name);
    const exists = await itemExits(Table.productsTable.tableName, req.name);

    if (exists) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: "Item with the same name already exists",
        }),
      };
    }

    // Standardize units in the main request
    const standardizedReq = standardizeUnits(req);
    
    // Standardize units in variants if they exist
    if (standardizedReq.variants?.length > 0) {
      standardizedReq.variants = standardizeVariantUnits(standardizedReq.variants);
      
      // Also standardize units within attribute strings
      standardizedReq.variants = standardizedReq.variants.map(variant => ({
        ...variant,
        attribute: standardizeAttributeUnits(variant.attribute)
      }));
    }

    console.log("Standardized units in add item:", {
      original: req.units,
      standardized: standardizedReq.units,
      originalB2cUnit: req.totalquantityB2cUnit,
      standardizedB2cUnit: standardizedReq.totalquantityB2cUnit
    });

    if (standardizedReq.variants?.length > 0) {
      // Determine if shared stock should be used for all variants
      const shouldUseSharedStock = (!standardizedReq.variants.some(v => v.stockQuantity && v.stockQuantity > 0)) && (standardizedReq.overallStock !== undefined && standardizedReq.overallStock !== null);
      for (const variant of standardizedReq.variants) {
        const variantId = Math.floor(Math.random() * 10000000000).toString();
        const discountPercentage = variant.comparePrice > 0
          ? ((variant.comparePrice - variant.sellingPrice) / variant.comparePrice) * 100
          : 0;

        const variantItem = {
          id: variantId,
          groupId: groupId,
          availability: variant.availability,
          name: standardizedReq.name,
          search_name: standardizedReq.name.toLowerCase(),
          expiry: variant.expiry || standardizedReq.expiry,
          category: standardizedReq.category,
          subCategory: standardizedReq.subCategory,
          tags: standardizedReq.tags || [],
          description: standardizedReq.description,
          images: variant.images || standardizedReq.images || [],
          image: (variant.images?.[0] || standardizedReq.images?.[0]) || "",
          units: variant.unit, // Already standardized
          totalQuantityInB2c: variant.totalQuantityInB2c,
          totalquantityB2cUnit: variant.totalquantityB2cUnit, // Already standardized
          stockQuantity: shouldUseSharedStock ? null : variant.stockQuantity,
          stockQuantityAlert: variant.lowStockAlert,
          purchasingPrice: variant.purchasingPrice,
          sellingPrice: variant.sellingPrice,
          comparePrice: variant.comparePrice,
          discount: discountPercentage.toFixed(2),
          attribute: variant.attribute, // Add the attribute field
          overallStock: standardizedReq.overallStock,
          overallStockUnit: standardizedReq.overallStockUnit,
          isVariant: true,
          isParentProduct: false,
          useSharedStock: shouldUseSharedStock ? true : undefined,
        };

        await save(Table.productsTable.tableName, variantItem);
      }
    } else {
      // Create main item when no variants are provided (existing logic)
      const mainItemId = Math.floor(Math.random() * 10000000000).toString();
      const discountPercentage = standardizedReq.comparePrice > 0
        ? ((standardizedReq.comparePrice - standardizedReq.sellingPrice) / standardizedReq.comparePrice) * 100
        : 0;

      const mainItem = {
        id: mainItemId,
        groupId: groupId,
        availability: standardizedReq.availability,
        name: standardizedReq.name,
        search_name: standardizedReq.name.toLowerCase(),
        expiry: standardizedReq.expiry,
        category: standardizedReq.category,
        subCategory: standardizedReq.subCategory,
        isVariant: false,
        isParentProduct: false,
        tags: standardizedReq.tags || [],
        description: standardizedReq.description,
        images: standardizedReq.images || [],
        image: standardizedReq.images?.[0] || "",
        units: standardizedReq.units,
        totalQuantityInB2c: standardizedReq.totalQuantityInB2c,
        totalquantityB2cUnit: standardizedReq.totalquantityB2cUnit,
        stockQuantity: standardizedReq.stockQuantity,
        stockQuantityAlert: standardizedReq.stockQuantityAlert,
        purchasingPrice: standardizedReq.purchasingPrice,
        sellingPrice: standardizedReq.sellingPrice,
        comparePrice: standardizedReq.comparePrice,
        discount: discountPercentage.toFixed(2),
        attribute: standardizedReq.attribute,
        overallStock: standardizedReq.overallStock,
        overallStockUnit: standardizedReq.overallStockUnit,
      };

      console.log("Saving main item with standardized units:", mainItem);
      await save(Table.productsTable.tableName, mainItem);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Item added successfully",
        groupId: groupId,
        hasVariants: standardizedReq.variants?.length > 0,
        variantCount: standardizedReq.variants?.length || 0
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
})
  // .use(bodyValidator(variantSchema))
  .use(errorHandler());
