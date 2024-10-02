import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";
import crypto from "crypto";

const client = new S3Client({ region: "ap-south-1" });

export const handler = middy(async (event) => {
	const imageName = event.queryStringParameters.fileName;
	if (!imageName) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "image name is required" }),
		};
	}
	const randomBytes = crypto.randomBytes(8).toString("hex");
	const command = new PutObjectCommand({
		Bucket: Bucket.mediaBucket.bucketName,
		Key: "productsImages/" + randomBytes + imageName.replace(/\s+/g, ""),
	});
	const url = await getSignedUrl(client, command, { expiresIn: 1800 });
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({
			uploadUrl: url,
		}),
	};
}).use(errorHandler());

export const deleteImage = middy(async (event) => {
	const imageKey = event.queryStringParameters.imageName;
	if (!imageKey) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "image key is required" }),
		};
	}

	const command = new DeleteObjectCommand({
		Bucket: Bucket.mediaBucket.bucketName,
		Key: imageKey,
	});

	await client.send(command);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "image deleted successfully" }),
	};
}).use(errorHandler());
