import XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";
import { save } from "../functions/common/data.js";

const readExcelFile = async (filePath) => {
	try {
		const normalizedPath = path.normalize(filePath);

		const absolutePath = path.resolve(normalizedPath);
		console.log("ab path", absolutePath);
		await fs.access(absolutePath);

		const buffer = await fs.readFile(absolutePath);
		const workbook = XLSX.read(buffer, { type: "buffer" });

		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		const data = XLSX.utils.sheet_to_json(worksheet);

		return data;
	} catch (error) {
		throw error;
	}
};

const main = async () => {
	try {
		const filePath = "E:/vegetable-list.xlsx";
		const excelData = await readExcelFile(filePath);
        let i = 0;
		excelData.forEach(async (product) => {
			console.log(`ADDING PRODUCT : ${i++}` );
			const uuid = crypto.randomUUID();
			const itemCode = uuid.split("-")[0].toUpperCase();
			const productItem = {
				id: uuid,
				itemCode,
				name: product.name,
				search_name: product.name.toLowerCase(),
				description: product.description || "",
				category: product.category,
				subCategory: product.subCategory,
				unit: product.unit.toLowerCase(),
				availability: false,
				image: product.images,
				images: product.images || [],
			};
			const inventoryItem = {
				id: itemCode,
				productId: uuid,
				purchasingPrice: Number(product.purchasingPrice) || "",
				msp: Number(product.msp) || "",
				stockQuantity: Number(product.stockQuantity) || "",
				expiry: product.expiry || "",
			};
			await Promise.all([
				save("prod-promodeargo-admin-inventoryTable", inventoryItem),
				save("prod-promodeargo-admin-productsTable", productItem),
			]);
		});
	} catch (error) {
		console.error("Error in main:", error);
	}
};

main();
