import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Table name - you may need to adjust this based on your environment
// For development: "dev-promodeagro-admin-productsTable"
// For production: "prod-promodeagro-admin-productsTable"
const TABLE_NAME = "prod-promodeagro-admin-productsTable";

// Target stock quantity to set
const TARGET_STOCK_QUANTITY = 100;

async function updateStockQuantity() {
  console.log(`Starting stock quantity update for table: ${TABLE_NAME}`);
  console.log(`Setting stockQuantity to: ${TARGET_STOCK_QUANTITY}`);
  
  let ExclusiveStartKey = undefined;
  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  try {
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        ExclusiveStartKey,
        // Only scan items that exist (all products should be updated)
        Limit: 100 // Process in batches of 100
      };
      
      console.log(`Scanning batch starting from: ${ExclusiveStartKey ? JSON.stringify(ExclusiveStartKey) : 'beginning'}`);
      
      const data = await docClient.send(new ScanCommand(scanParams));
      totalScanned += data.Items.length;
      
      console.log(`Found ${data.Items.length} items in this batch`);
      
      // Process each item
      for (const item of data.Items) {
        // Skip parent products that use shared stock (they have stockQuantity set to null)
        if (item.isParentProduct && item.stockQuantity === null) {
          console.log(`  Skipping parent product ${item.id} (uses shared stock)`);
          totalSkipped++;
          continue;
        }
        
        // Check if the item needs updating
        const currentStockQuantity = item.stockQuantity;
        if (currentStockQuantity === TARGET_STOCK_QUANTITY) {
          console.log(`  Item ${item.id}: stockQuantity already ${TARGET_STOCK_QUANTITY}, skipping`);
          totalSkipped++;
          continue;
        }
        
        // Update the item
        const updateParams = {
          TableName: TABLE_NAME,
          Key: { id: item.id },
          UpdateExpression: "SET stockQuantity = :stockQuantity",
          ExpressionAttributeValues: {
            ":stockQuantity": TARGET_STOCK_QUANTITY
          },
          ReturnValues: "ALL_NEW"
        };
        
        try {
          await docClient.send(new UpdateCommand(updateParams));
          console.log(`  ✅ Item ${item.id}: stockQuantity ${currentStockQuantity} → ${TARGET_STOCK_QUANTITY}`);
          totalUpdated++;
        } catch (updateError) {
          console.error(`  ❌ Failed to update item ${item.id}:`, updateError.message);
        }
      }
      
      ExclusiveStartKey = data.LastEvaluatedKey;
      
      if (ExclusiveStartKey) {
        console.log(`Continuing with next batch...`);
      }
      
    } while (ExclusiveStartKey);
    
    console.log(`\n✅ Stock quantity update completed!`);
    console.log(`Total items scanned: ${totalScanned}`);
    console.log(`Total items updated: ${totalUpdated}`);
    console.log(`Total items skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error("❌ Error during stock quantity update:", error);
    throw error;
  }
}

// Function to preview what would be changed (dry run)
async function previewChanges() {
  console.log(`Previewing stock quantity changes for table: ${TABLE_NAME}`);
  console.log(`Would set stockQuantity to: ${TARGET_STOCK_QUANTITY}`);
  
  let ExclusiveStartKey = undefined;
  let totalScanned = 0;
  let totalWouldUpdate = 0;
  let totalWouldSkip = 0;
  
  try {
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        ExclusiveStartKey,
        Limit: 100
      };
      
      const data = await docClient.send(new ScanCommand(scanParams));
      totalScanned += data.Items.length;
      
      // Process each item
      for (const item of data.Items) {
        // Skip parent products that use shared stock
        if (item.isParentProduct && item.stockQuantity === null) {
          console.log(`  Would skip parent product ${item.id} (uses shared stock)`);
          totalWouldSkip++;
          continue;
        }
        
        const currentStockQuantity = item.stockQuantity;
        if (currentStockQuantity === TARGET_STOCK_QUANTITY) {
          console.log(`  Would skip item ${item.id}: stockQuantity already ${TARGET_STOCK_QUANTITY}`);
          totalWouldSkip++;
          continue;
        }
        
        console.log(`  Would update item ${item.id}: stockQuantity ${currentStockQuantity} → ${TARGET_STOCK_QUANTITY}`);
        totalWouldUpdate++;
      }
      
      ExclusiveStartKey = data.LastEvaluatedKey;
      
    } while (ExclusiveStartKey);
    
    console.log(`\n📋 Preview completed!`);
    console.log(`Total items that would be scanned: ${totalScanned}`);
    console.log(`Total items that would be updated: ${totalWouldUpdate}`);
    console.log(`Total items that would be skipped: ${totalWouldSkip}`);
    
  } catch (error) {
    console.error("❌ Error during preview:", error);
    throw error;
  }
}

// Main function to handle command line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === "preview" || command === "--preview" || command === "-p") {
    await previewChanges();
  } else if (command === "update" || command === "--update" || command === "-u" || !command) {
    await updateStockQuantity();
  } else {
    console.log("Usage:");
    console.log("  node update-stock-quantity.js [preview|update]");
    console.log("");
    console.log("Commands:");
    console.log("  preview, -p, --preview  Preview changes without applying them");
    console.log("  update, -u, --update    Apply the changes (default)");
    console.log("");
    console.log("Examples:");
    console.log("  node update-stock-quantity.js preview");
    console.log("  node update-stock-quantity.js update");
    console.log("  node update-stock-quantity.js");
  }
}

// Run the script
main().catch(console.error); 