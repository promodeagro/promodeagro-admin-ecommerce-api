// Unit standardization utility functions

// Unit mapping from old/variant spellings to standard units
const unitMap = {
  // For pieces
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
  "kilogra": "Kg", // Common misspelling
  "kilog": "Kg",   // Common misspelling
  "kilo": "Kg",    // Common abbreviation
  
  // For liters
  "litre": "Ltr",
  "ltr": "Ltr",
  "Ltr": "Ltr",
  "LTR": "Ltr",
  "liters": "Ltr",
  "Liters": "Ltr",
  "liter": "Ltr",
  "Liter": "Ltr",
  "litres": "Ltr",
  
  // For packets
  "pkt": "Pkt",
  "Pkt": "Pkt",
  "PKT": "Pkt",
  "packet": "Pkt",
  "Packet": "Pkt",
  "packets": "Pkt",
  "Packets": "Pkt"
};

/**
 * Unit conversion factors (to base units)
 * Base units: Pcs = 1, Gms = 1, Kg = 1000, Ltr = 1, Pkt = 1
 */
const unitConversionFactors = {
  // Weight conversions (Gms as base)
  "Gms": 1,
  "Kg": 1000, // 1 Kg = 1000 Gms
  
  // Volume conversions (Ltr as base)
  "Ltr": 1,
  
  // Count conversions (Pcs as base)
  "Pcs": 1,
  
  // Package conversions (Pkt as base)
  "Pkt": 1
};

/**
 * Standardizes a unit string to the consistent format
 * @param {string} unit - The unit to standardize
 * @returns {string} - The standardized unit
 */
export function standardizeUnit(unit) {
  if (!unit || typeof unit !== 'string') {
    return unit;
  }
  
  // Try exact match first, then lowercase match
  return unitMap[unit] || unitMap[unit.toLowerCase()] || unit;
}

/**
 * Converts quantity from one unit to another
 * @param {number} quantity - The quantity to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @returns {number} - The converted quantity
 */
export function convertQuantity(quantity, fromUnit, toUnit) {
  if (!quantity || !fromUnit || !toUnit) {
    return quantity;
  }
  
  const standardizedFromUnit = standardizeUnit(fromUnit);
  const standardizedToUnit = standardizeUnit(toUnit);
  
  // If units are the same, no conversion needed
  if (standardizedFromUnit === standardizedToUnit) {
    return quantity;
  }
  
  // Get conversion factors
  const fromFactor = unitConversionFactors[standardizedFromUnit];
  const toFactor = unitConversionFactors[standardizedToUnit];
  
  if (!fromFactor || !toFactor) {
    console.warn(`Unknown unit conversion: ${fromUnit} to ${toUnit}`);
    return quantity; // Return original if conversion not possible
  }
  
  // Convert to base unit first, then to target unit
  const baseQuantity = quantity * fromFactor;
  const convertedQuantity = baseQuantity / toFactor;
  
  return convertedQuantity;
}

/**
 * Converts quantity to the target unit for inventory operations
 * @param {number} quantity - The quantity to convert
 * @param {string} itemUnit - The unit of the order item (e.g., "500Grm")
 * @param {string} stockUnit - The unit of the stock (e.g., "Kg")
 * @returns {number} - The converted quantity in stock units
 */
export function convertToStockUnit(quantity, itemUnit, stockUnit) {
  if (!quantity || !itemUnit || !stockUnit) {
    return quantity;
  }
  // Add type check for itemUnit
  if (typeof itemUnit !== 'string') {
    console.warn(`itemUnit is not a string:`, itemUnit);
    return quantity;
  }
  // Extract numeric value and unit from itemUnit (e.g., "500Grm" -> 500, "Grm")
  const itemUnitMatch = itemUnit.match(/^(\d+(?:\.\d+)?)(.+)$/);
  if (!itemUnitMatch) {
    console.warn(`Invalid item unit format: ${itemUnit}`);
    return quantity;
  }
  
  const itemQuantity = parseFloat(itemUnitMatch[1]);
  const itemUnitType = itemUnitMatch[2];
  
  // Convert the item quantity to stock unit
  const convertedItemQuantity = convertQuantity(itemQuantity, itemUnitType, stockUnit);
  
  // Multiply by the order quantity
  return quantity * convertedItemQuantity;
}

/**
 * Standardizes all unit fields in an object
 * @param {Object} data - The object containing unit fields
 * @returns {Object} - The object with standardized units
 */
export function standardizeUnits(data) {
  const standardized = { ...data };
  
  // Standardize units field
  if (standardized.units) {
    standardized.units = standardizeUnit(standardized.units);
  }
  
  // Standardize totalquantityB2cUnit field
  if (standardized.totalquantityB2cUnit) {
    standardized.totalquantityB2cUnit = standardizeUnit(standardized.totalquantityB2cUnit);
  }
  
  // Standardize overallStockUnit field
  if (standardized.overallStockUnit) {
    standardized.overallStockUnit = standardizeUnit(standardized.overallStockUnit);
  }
  
  return standardized;
}

/**
 * Standardizes units in variant objects
 * @param {Array} variants - Array of variant objects
 * @returns {Array} - Array with standardized units
 */
export function standardizeVariantUnits(variants) {
  if (!Array.isArray(variants)) {
    return variants;
  }
  
  return variants.map(variant => {
    const standardized = { ...variant };
    
    // Standardize unit field in variant
    if (standardized.unit) {
      standardized.unit = standardizeUnit(standardized.unit);
    }
    
    // Standardize other unit fields in variant
    if (standardized.totalquantityB2cUnit) {
      standardized.totalquantityB2cUnit = standardizeUnit(standardized.totalquantityB2cUnit);
    }
    
    if (standardized.overallStockUnit) {
      standardized.overallStockUnit = standardizeUnit(standardized.overallStockUnit);
    }
    
    return standardized;
  });
}

/**
 * Gets the list of valid standardized units for validation
 * @returns {Array} - Array of valid unit values
 */
export function getValidUnits() {
  return ["Pcs", "Gms", "Kg", "Ltr", "Pkt"];
}

/**
 * Validates if a unit is valid (standardized)
 * @param {string} unit - The unit to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidUnit(unit) {
  return getValidUnits().includes(standardizeUnit(unit));
}

/**
 * Standardizes units within attribute strings (e.g., "100kilogra-500kg" -> "100Kg-500Kg")
 * @param {string} attribute - The attribute string that may contain units
 * @returns {string} - The attribute with standardized units
 */
export function standardizeAttributeUnits(attribute) {
  if (!attribute || typeof attribute !== 'string') {
    return attribute;
  }
  
  let standardized = attribute;
  
  // Replace common misspellings and variations in the attribute string
  Object.entries(unitMap).forEach(([oldUnit, newUnit]) => {
    // Use case-insensitive regex to replace all occurrences
    const regex = new RegExp(oldUnit, 'gi');
    standardized = standardized.replace(regex, newUnit);
  });
  
  return standardized;
} 

/**
 * Handles stock quantity update for a product (non-shared stock)
 * @param {Object} product - The product object
 * @param {number} quantity - The quantity to update
 * @param {string} operation - 'add' or 'subtract'
 * @returns {Object} - Update expressions for DynamoDB
 */
export function handleStockQuantityUpdate(product, quantity, operation) {
  const update = {};
  const op = operation === 'add' ? '+' : '-';
  // Update stockQuantity if present
  if (product.stockQuantity !== undefined && product.stockQuantity !== null) {
    update.stockQuantityUpdate = {
      expression: `SET stockQuantity = stockQuantity ${op} :qty` ,
      values: { ':qty': quantity }
    };
  }
  return update;
}

/**
 * Validates if a product has enough stock (non-shared stock)
 * @param {Object} product - The product object
 * @param {number} requiredQuantity - The quantity required
 * @returns {Object} - { isAvailable, availableStock, stockField }
 */
export function validateStockAvailability(product, requiredQuantity) {
  // Prefer overallStock if present, else stockQuantity
  let availableStock = null;
  let stockField = null;
  if (product.stockQuantity !== undefined && product.stockQuantity !== null) {
    availableStock = product.stockQuantity;
    stockField = 'stockQuantity';
  }
  return {
    isAvailable: availableStock !== null && availableStock >= requiredQuantity,
    availableStock,
    stockField
  };
} 

/**
 * Updates shared stock across all variants in a group
 * @param {string} groupId - The group ID
 * @param {number} quantity - The quantity to update
 * @param {string} operation - 'add' or 'subtract'
 * @param {Object} docClient - DynamoDBDocumentClient instance
 * @param {string} tableName - Table name (products or inventory)
 */
export async function updateSharedStockAcrossVariants(groupId, quantity, operation, docClient, tableName) {
  // Scan for all variants in the group
  const scanParams = {
    TableName: tableName,
    FilterExpression: 'groupId = :groupId',
    ExpressionAttributeValues: { ':groupId': groupId }
  };
  const { Items: variants } = await docClient.send(new (require("@aws-sdk/lib-dynamodb").ScanCommand)(scanParams));
  const op = operation === 'add' ? '+' : '-';
  // Update overallStock for all variants
  const updatePromises = (variants || []).map(variant => {
    if (variant.overallStock !== undefined && variant.overallStock !== null) {
      const updateParams = {
        TableName: tableName,
        Key: { id: variant.id },
        UpdateExpression: `SET overallStock = overallStock ${op} :qty`,
        ExpressionAttributeValues: { ':qty': quantity }
      };
      return docClient.send(new (require("@aws-sdk/lib-dynamodb").UpdateCommand)(updateParams));
    }
    return Promise.resolve();
  });
  await Promise.all(updatePromises);
}

/**
 * Validates shared stock availability across all variants in a group
 * @param {Array} variants - Array of variant objects
 * @param {number} requiredQuantity - The quantity required
 * @returns {Object} - { isAvailable, availableStock, stockField }
 */
export function validateSharedStockAvailability(variants, requiredQuantity) {
  // Find the minimum overallStock among all variants (should be the same)
  const stocks = (variants || []).map(v => v.overallStock).filter(s => s !== undefined && s !== null);
  const availableStock = stocks.length > 0 ? Math.min(...stocks) : null;
  return {
    isAvailable: availableStock !== null && availableStock >= requiredQuantity,
    availableStock,
    stockField: 'overallStock (shared across variants)'
  };
} 