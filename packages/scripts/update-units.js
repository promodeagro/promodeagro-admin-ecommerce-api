import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Unit mapping from old/variant spellings to standard units
const unitMap = {
  // For totalquantityB2cUnit field
  "pieces": "Pcs",
  "piece": "Pcs", 
  "pcs": "Pcs",
  "Pieces": "Pcs",
  "Piece": "Pcs",
  "PCS": "Pcs",
  
  // For grams/gms
  "grams": "Gms",
  "gms": "Gms",
  "Grams": "Gms",
  "GMS": "Gms",
  "gram": "Gms",
  "Gram": "Gms",
  
  // For kilograms
  "kg": "Kg",
  "Kg": "Kg",
  "KG": "Kg",
  "kgs": "Kg",
  "Kgs": "Kg",
  "KGS": "Kg",
  "kilogram": "Kg",
  "Kilogram": "Kg",
  "kilograms": "Kg",
  "Kilograms": "Kg",
  
  // For liters
  "litre": "Ltr",
  "ltr": "Ltr",
  "Ltr": "Ltr",
  "LTR": "Ltr",
  "liters": "Ltr",
  "Liters": "Ltr",
  "liter": "Ltr",
  "Liter": "Ltr",
  
  // For packets
  "pkt": "Pkt",
  "Pkt": "Pkt",
  "PKT": "Pkt",
  "packet": "Pkt",
  "Packet": "Pkt",
  "packets": "Pkt",
  "Packets": "Pkt"
};

// Get table name from SST (you'll need to replace this with your actual table name)
// For now, we'll use a placeholder - you'll need to get this from your SST deployment
const TABLE_NAME ="prod-promodeagro-admin-productsTable";

async function updateUnits() {
  console.log(`Starting unit standardization for table: ${TABLE_NAME}`);
  console.log("Unit mapping:", unitMap);
  
  let ExclusiveStartKey = undefined;
  let totalScanned = 0;
  let totalUpdated = 0;
  
  try {
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        ExclusiveStartKey,
        // Only scan items that have unit fields
        FilterExpression: "attribute_exists(#units) OR attribute_exists(#totalB2cUnit)",
        ExpressionAttributeNames: {
          "#units": "units",
          "#totalB2cUnit": "totalquantityB2cUnit"
        }
      };
      
      console.log(`Scanning batch starting from: ${ExclusiveStartKey ? JSON.stringify(ExclusiveStartKey) : 'beginning'}`);
      
      const data = await docClient.send(new ScanCommand(scanParams));
      totalScanned += data.Items.length;
      
      console.log(`Found ${data.Items.length} items in this batch`);
      
      // Process each item
      for (const item of data.Items) {
        let needsUpdate = false;
        const updates = {};
        
        // Check and update 'units' field
        if (item.units) {
          const oldUnit = item.units;
          const newUnit = unitMap[oldUnit.toLowerCase()] || unitMap[oldUnit];
          
          if (newUnit && newUnit !== oldUnit) {
            updates.units = newUnit;
            needsUpdate = true;
            console.log(`  Item ${item.id}: units "${oldUnit}" → "${newUnit}"`);
          }
        }
        
        // Check and update 'totalquantityB2cUnit' field
        if (item.totalquantityB2cUnit) {
          const oldUnit = item.totalquantityB2cUnit;
          const newUnit = unitMap[oldUnit.toLowerCase()] || unitMap[oldUnit];
          
          if (newUnit && newUnit !== oldUnit) {
            updates.totalquantityB2cUnit = newUnit;
            needsUpdate = true;
            console.log(`  Item ${item.id}: totalquantityB2cUnit "${oldUnit}" → "${newUnit}"`);
          }
        }
        
        // Update the item if needed
        if (needsUpdate) {
          const updateParams = {
            TableName: TABLE_NAME,
            Key: { id: item.id },
            UpdateExpression: "SET " + Object.keys(updates).map(key => `#${key} = :${key}`).join(", "),
            ExpressionAttributeNames: Object.fromEntries(
              Object.keys(updates).map(key => [`#${key}`, key])
            ),
            ExpressionAttributeValues: Object.fromEntries(
              Object.entries(updates).map(([key, value]) => [`:${key}`, value])
            ),
            ReturnValues: "ALL_NEW"
          };
          
          await docClient.send(new UpdateCommand(updateParams));
          totalUpdated++;
        }
      }
      
      ExclusiveStartKey = data.LastEvaluatedKey;
      
      if (ExclusiveStartKey) {
        console.log(`Continuing with next batch...`);
      }
      
    } while (ExclusiveStartKey);
    
    console.log(`\n✅ Unit standardization completed!`);
    console.log(`Total items scanned: ${totalScanned}`);
    console.log(`Total items updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error("❌ Error during unit standardization:", error);
    throw error;
  }
}

// Function to preview what would be changed (dry run)
async function previewChanges() {
  console.log(`Previewing unit changes for table: ${TABLE_NAME}`);
  console.log("Unit mapping:", unitMap);
  
  let ExclusiveStartKey = undefined;
  let totalScanned = 0;
  let totalWouldUpdate = 0;
  
  try {
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        ExclusiveStartKey,
        FilterExpression: "attribute_exists(#units) OR attribute_exists(#totalB2cUnit)",
        ExpressionAttributeNames: {
          "#units": "units",
          "#totalB2cUnit": "totalquantityB2cUnit"
        }
      };
      
      const data = await docClient.send(new ScanCommand(scanParams));
      totalScanned += data.Items.length;
      
      // Process each item
      for (const item of data.Items) {
        let itemWouldUpdate = false;
        
        // Check 'units' field
        if (item.units) {
          const oldUnit = item.units;
          const newUnit = unitMap[oldUnit.toLowerCase()] || unitMap[oldUnit];
          
          if (newUnit && newUnit !== oldUnit) {
            console.log(`  Item ${item.id}: units "${oldUnit}" → "${newUnit}"`);
            itemWouldUpdate = true;
          }
        }
        
        // Check 'totalquantityB2cUnit' field
        if (item.totalquantityB2cUnit) {
          const oldUnit = item.totalquantityB2cUnit;
          const newUnit = unitMap[oldUnit.toLowerCase()] || unitMap[oldUnit];
          
          if (newUnit && newUnit !== oldUnit) {
            console.log(`  Item ${item.id}: totalquantityB2cUnit "${oldUnit}" → "${newUnit}"`);
            itemWouldUpdate = true;
          }
        }
        
        if (itemWouldUpdate) {
          totalWouldUpdate++;
        }
      }
      
      ExclusiveStartKey = data.LastEvaluatedKey;
      
    } while (ExclusiveStartKey);
    
    console.log(`\n📊 Preview Summary:`);
    console.log(`Total items scanned: ${totalScanned}`);
    console.log(`Total items that would be updated: ${totalWouldUpdate}`);
    
  } catch (error) {
    console.error("❌ Error during preview:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!TABLE_NAME || TABLE_NAME === "YourProductsTableName") {
    console.error("❌ Please set the PRODUCTS_TABLE_NAME environment variable or update the script with your actual table name");
    console.log("You can get your table name from SST console or by running: npx sst console");
    process.exit(1);
  }
  
  switch (command) {
    case "preview":
      await previewChanges();
      break;
    case "update":
      await updateUnits();
      break;
    default:
      console.log("Usage: node update-units.js [preview|update]");
      console.log("  preview - Show what would be changed without making changes");
      console.log("  update  - Actually update the units in DynamoDB");
      console.log("");
      console.log("Example:");
      console.log("  node update-units.js preview");
      console.log("  node update-units.js update");
      break;
  }
}

// Run the script
main().catch(console.error); 