import crypto from "crypto";
import { save, itemExits } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

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
  buyerLimit: z.number().nonnegative(),
  lowStockAlert: z.number().nonnegative(),
  availability: z.boolean(),
  unit: z.string(),
  minimumSellingWeight: z.number().nonnegative().optional(),
  maximumSellingWeight: z.number().nonnegative().optional(),
  MinimumSellingWeightUnit: z.string().optional(),
  MaximumSellingWeightUnit: z.string().optional(),
  totalQuantityInB2c: z.number().nonnegative().optional(),
  totalquantityB2cUnit: z.string().optional(),
  stockQuantity: z.number().nonnegative(),
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
  minimumSellingWeight: z.number().nonnegative(),
  maximumSellingWeight: z.number().nonnegative(),
  buyerLimit: z.number().nonnegative(),
  expiry: z.string(),
  MinimumSellingWeightUnit: z.string(),
  MaximumSellingWeightUnit: z.string(),
  totalquantityB2cUnit: z.string(),
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

    if (req.variants?.length > 0) {
      for (const variant of req.variants) {
        const variantId = Math.floor(Math.random() * 10000000000).toString();
        const discountPercentage = variant.comparePrice > 0
          ? ((variant.comparePrice - variant.sellingPrice) / variant.comparePrice) * 100
          : 0;

        const variantItem = {
          id: variantId,
          groupId: groupId,
          availability: variant.availability,
          name: req.name,
          search_name: req.name.toLowerCase(),
          expiry: req.expiry,
          category: req.category,
          subCategory: req.subCategory,
          isVariant: true,
          tags: req.tags || [],
          description: req.description,
          images: req.images || [],
          image: req.images?.[0] || "",
          units: variant.unit,
          minimumSellingWeight: variant.minimumSellingWeight,
          maximumSellingWeight: variant.maximumSellingWeight,
          MaximumSellingWeightUnit: variant.MaximumSellingWeightUnit,
          MinimumSellingWeightUnit: variant.MinimumSellingWeightUnit,
          totalQuantityInB2c: variant.totalQuantityInB2c,
          totalquantityB2cUnit: variant.totalquantityB2cUnit,
          stockQuantity: variant.stockQuantity,
          buyerLimit: variant.buyerLimit,
          stockQuantityAlert: variant.lowStockAlert,
          purchasingPrice: variant.purchasingPrice,
          sellingPrice: variant.sellingPrice,
          comparePrice: variant.comparePrice,
          discount: discountPercentage.toFixed(2),
        };

        console.log("Saving variant:", variantItem);
        await save(Table.productsTable.tableName, variantItem);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Item and variants added successfully" }),
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
