import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";
import crypto from "crypto";
import { promisify } from "util";

const randomBytes = promisify(crypto.randomBytes);

const client = new S3Client({ region: "us-east-1" });

export const handler = middy(async (event) => {
	const imageName = event.queryStringParameters.fileName;
	let bytes = await randomBytes(16);
	if (!imageName) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "image name is required" }),
		};
	}
	const command = new PutObjectCommand({
		Bucket: Bucket.mediaBucket.bucketName,
		Key: bytes + imageName,
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
