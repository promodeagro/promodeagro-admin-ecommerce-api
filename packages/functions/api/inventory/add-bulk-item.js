import { read, readFile, utils } from "xlsx";
import crypto from "crypto";
import { save, itemExits } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { parse } from "lambda-multipart-parser"; // For parsing multipart form-data
import { standardizeUnits, standardizeVariantUnits } from "./unitUtils";


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
    sellingPrice: z.number().nonnegative(),  // Fixed: should be a number
    comparePrice: z.number().nonnegative(),  // Fixed: should be a number
    lowStockAlert: z.number().nonnegative(), // Fixed: should be a number
    availability: z.boolean(),
    unit: z.string(),
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
    sellingPrice: z.number().nonnegative(),  // Fixed: should be a number
    comparePrice: z.number().nonnegative(),  // Fixed: should be a number
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




async function excelToJson(fileBuffer) {
    const workbook = read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = utils.sheet_to_json(sheet);

    let productsDict = {};

    jsonData.forEach(row => {
        const productName = row["name"]?.toString().trim() || "Unnamed Product";
        const category = row["category"]?.toString().trim() || "Uncategorized";
        const subCategory = row["subCategory"]?.toString().trim() || "General";

        // Ensure numeric values are correctly parsed
        const purchasingPrice = parseFloat(row["purchasingPrice"]) || 0.0;
        const sellingPrice = parseFloat(row["sellingPrice"]) || 0.0;
        const comparePrice = parseFloat(row["comparePrice"]) || 0.0;
        const stockQuantity = parseInt(row["stockQuantity"]) || 0;
        const stockAlert = parseInt(row["stockQuantityAlert"]) || 0;
        const totalQuantityB2C = parseInt(row["totalQuantityInB2c"]) || 0;
        const overallStock = parseFloat(row["overallStock"]) || 0;
        const overallStockUnit = row["overallStockUnit"]?.toString().trim() || "unit";

        const expiry = row["expiry"]?.toString().trim() || "No Expiry";

        // Ensure string fields are properly trimmed and standardized
        const stockUnit = row["stockQuantity unit"]?.toString().trim() || "unit";
        const totalB2CUnit = row["TotalquantityB2cUnit"]?.toString().trim() || "unit";

        // Handle images and tags as arrays
        const images = row["images"] ? row["images"].toString().split(",").map(img => img.trim()) : [];
        const tags = row["Tags"] ? row["Tags"].toString().split(",").map(tag => tag.trim()) : [];

        // Boolean check for variant
        const isVariant = row["isVariant"]?.toString().toLowerCase() === "true";

        let productData = {
            name: productName,
            description: row["description"]?.toString().trim() || "No description available",
            category,
            subCategory,
            availability: stockQuantity > 0,
            units: stockUnit,
            purchasingPrice,
            sellingPrice,
            comparePrice,
            stockQuantity,
            stockQuantityAlert: stockAlert,
            totalQuantityInB2c: totalQuantityB2C,
            expiry,
            totalquantityB2cUnit: totalB2CUnit,
            overallStock,
            overallStockUnit,
            images,
            tags,
            variants: []
        };
        
        // Standardize units in the product data
        productData = standardizeUnits(productData);

        if (productsDict[productName]) {
            if (isVariant) {
                let variantData = {
                    attribute: purchasingPrice.toString(),  // Fixed conversion issue
                    quantity: 1,
                    purchasingPrice,
                    sellingPrice,
                    comparePrice,
                    lowStockAlert: stockAlert,
                    availability: stockQuantity > 0,
                    unit: stockUnit,
                    totalQuantityInB2c: totalQuantityB2C,
                    totalquantityB2cUnit: totalB2CUnit,
                    stockQuantity
                };
                
                // Standardize units in the variant data
                variantData = standardizeUnits(variantData);
                productsDict[productName].variants.push(variantData);
            }
        } else {
            productsDict[productName] = productData;
        }
    });

    const jsonOutput = JSON.stringify(Object.values(productsDict), null, 4);

    // fs.writeFileSync("products_output.json", jsonOutput, "utf8");
    // console.log(jsonOutput)

    console.log("✅ JSON data successfully saved ");
    return jsonOutput;
}



export const handler = middy(async (event) => {

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

    const data = await excelToJson(file.content)
  
   const products = JSON.parse(data)
    console.log(typeof products); // Should print 'object'
    // console.log(data); // Print the actual structure
    

    products.map( product => {
        console.log(product)
    })
    

    // const productId = Math.floor(Math.random() * 10000000000);



    // const exists = await itemExits(Table.productsTable.tableName, req.name);
    // if (exists) {
    //     return {
    //         statusCode: 409,
    //         body: JSON.stringify({
    //             message: "Item with the same name already exists",
    //         }),
    //     };
    // }

    // const discountPercentage = ((req.comparePrice - req.sellingPrice) / req.comparePrice) * 100;

    // console.log(`Discount: ${discountPercentage.toFixed(2)}%`);

    // const productItem = {
    //     id: productId.toString(),
    //     name: req.name + " - " + req.totalQuantityInB2c + " " + req.totalquantityB2cUnit,
    //     quantity: req.quantity,
    //     search_name: req.name.toLowerCase(),
    //     availability: req.availability,
    //     expiry: req.expiry,
    //     category: req.category,
    //     subCategory: req.subCategory,
    //     tags: req.tags || [],
    //     description: req.description,
    //     images: req.images || [],
    //     image: req.images[0],
    //     units: req.units,
    //     isVariant: false,
    //     minimumSellingWeight: req.minimumSellingWeight,
    //     maximumSellingWeight: req.maximumSellingWeight,
    //     MaximumSellingWeightUnit: req.MaximumSellingWeightUnit,
    //     MinimumSellingWeightUnit: req.MinimumSellingWeightUnit,
    //     totalQuantityInB2c: req.totalQuantityInB2c,
    //     totalquantityB2cUnit: req.TotalquantityB2cUnit,
    //     stockQuantity: req.stockQuantity,
    //     buyerLimit: req.buyerLimit,
    //     stockQuantityAlert: req.stockQuantityAlert,
    //     purchasingPrice: req.purchasingPrice,
    //     sellingPrice: req.sellingPrice,
    //     comparePrice: req.comparePrice,
    //     discount: discountPercentage.toFixed(2),
    // };

    // console.log("Saving parent product", productItem);
    // await save(Table.productsTable.tableName, productItem);

    // if (req.variants && req.variants.length > 0) {
    //     for (const variant of req.variants) {
    //         const variantId = Math.floor(Math.random() * 10000000000).toString();
    //         const discountPercentage = ((variant.comparePrice - variant.sellingPrice) / variant.comparePrice) * 100;
    //         const variantItem = {
    //             id: variantId,
    //             parentProductId: productId,
    //             availability: variant.availability,
    //             name: req.name + " - " + variant.totalQuantityInB2c + " " + variant.totalquantityB2cUnit,  // Fixed: Corrected variant naming
    //             search_name: req.name.toLowerCase(),
    //             expiry: req.expiry,
    //             category: req.category,
    //             subCategory: req.subCategory,
    //             isVariant: true,
    //             tags: req.tags || [],
    //             description: req.description,
    //             images: req.images || [],
    //             image: req.images[0],
    //             units: variant.unit, // Fixed: `units` should be from the variant, not parent
    //             minimumSellingWeight: variant.minimumSellingWeight,
    //             maximumSellingWeight: variant.maximumSellingWeight,
    //             MaximumSellingWeightUnit: variant.MaximumSellingWeightUnit,
    //             MinimumSellingWeightUnit: variant.MinimumSellingWeightUnit,
    //             totalQuantityInB2c: variant.totalQuantityInB2c,
    //             totalquantityB2cUnit: variant.totalquantityB2cUnit,
    //             stockQuantity: variant.stockQuantity,
    //             buyerLimit: variant.buyerLimit,
    //             stockQuantityAlert: variant.lowStockAlert,
    //             purchasingPrice: variant.purchasingPrice,
    //             sellingPrice: variant.sellingPrice,
    //             comparePrice: variant.comparePrice,
    //             discount: discountPercentage.toFixed(2),
    //         };
    //         console.log("Saving variant", variantItem);
    //         await save(Table.productsTable.tableName, variantItem);
    //     }
    // }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Item and variants added successfully" }),
    };
})

// Run the script with the correct Excel file

