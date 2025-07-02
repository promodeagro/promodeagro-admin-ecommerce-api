import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import ExcelJS from "exceljs";
import { Table } from "sst/node/table";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({
    region: "us-east-1",
});

const BUCKET_NAME = "promodeagro-images-prod-ui-root";

const exportProducts = async () => {
  try {
    // Scan DynamoDB to get all products
    const command = new ScanCommand({ TableName: Table.productsTable.tableName });
    const response = await docClient.send(command);
    const products = response.Items || [];

    if (!products.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No products found" }),
      };
    }

    // Create an Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    // Extract headers dynamically from first product
    const headers = Object.keys(products[0]).map((key) => ({
      header: key.toUpperCase(),
      key: key,
      width: 20,
    }));
    worksheet.columns = headers;

    // Add product rows
    products.forEach((product) => worksheet.addRow(product));

    // Generate buffer for Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to S3
    const fileName = `exports/products.xlsx`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );

    // Generate S3 file URL
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Products exported successfully",
        fileUrl,
      }),
    };
  } catch (error) {
    console.error("Export Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to export products" }),
    };
  }
};

// Wrap with Middy middleware
export const handler = middy(exportProducts).use(errorHandler());
