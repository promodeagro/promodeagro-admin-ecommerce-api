import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from 'stream';

const sourceRegion = 'us-east-1';
const destinationRegion = 'ap-south-1';

const sourceS3 = new S3Client({ region: sourceRegion });
const destinationS3 = new S3Client({ region: destinationRegion });

const sourceDynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({ region: sourceRegion }));
const destinationDynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({ region: destinationRegion }));

async function migrateS3Bucket(sourceBucket, destinationBucket) {
  console.log(`Migrating S3 bucket from ${sourceBucket} to ${destinationBucket}`);
  const listParams = {
    Bucket: sourceBucket
  };
  const listedObjects = await sourceS3.send(new ListObjectsV2Command(listParams));
  
  for (const object of listedObjects.Contents) {
    const getParams = {
      Bucket: sourceBucket,
      Key: object.Key
    };
    
    const { Body } = await sourceS3.send(new GetObjectCommand(getParams));
    
    const upload = new Upload({
      client: destinationS3,
      params: {
        Bucket: destinationBucket,
        Key: object.Key,
        Body: Body
      }
    });

    await upload.done();
    console.log(`Migrated object: ${object.Key}`);
  }
  console.log('S3 bucket migration completed');
}

async function updateDynamoDBImageUrls(tableName, oldBucketName, newBucketName) {
  console.log(`Updating image URLs in DynamoDB table: ${tableName}`);
  const scanParams = {
    TableName: tableName
  };
  const scanCommand = new ScanCommand(scanParams);
  const items = await sourceDynamoDB.send(scanCommand);
  
  for (const item of items.Items) {
    if (item.imageUrl && item.imageUrl.includes(oldBucketName)) {
      const newImageUrl = item.imageUrl.replace(oldBucketName, newBucketName);
      const updateParams = {
        TableName: tableName,
        Key: { id: item.id },  // Assuming 'id' is your primary key
        UpdateExpression: 'set imageUrl = :newUrl',
        ExpressionAttributeValues: {
          ':newUrl': newImageUrl
        }
      };
      const updateCommand = new UpdateCommand(updateParams);
      await destinationDynamoDB.send(updateCommand);
      console.log(`Updated item: ${item.id}`);
    }
  }
  console.log('DynamoDB image URL updates completed');
}

async function migrateData() {
  const sourceBucket = 'prod-promodeargo-admin-api-mediabucket46c59097-tynsj9joexji';
  const destinationBucket = 'prod-promodeargo-admin-api-mediabucket46c59097-ycc5ezwjsx2a';
  const dynamoDBTable = 'YourTableName';
  
  try {
    await migrateS3Bucket(sourceBucket, destinationBucket);
    // await updateDynamoDBImageUrls(dynamoDBTable, sourceBucket, destinationBucket);
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrateData();