import ky from "ky";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

export const authorizer = async (event) => {
	try {
		const token = event.headers["authorization"]?.split(" ")[1];
		if (!token) {
			return generatePolicy("user", "Deny", event.methodArn);
		}
		const decodedHeader = jwt.decode(token, { complete: true });
		const kid = decodedHeader?.header.kid;

		if (!kid) {
			return generatePolicy("user", "Deny", event.methodArn);
		}
		const keys = await getCognitoKeys();
		const key = keys.find((k) => k.kid === kid);
		if (!key) {
			return generatePolicy("user", "Deny", event.methodArn);
		}
		const pem = jwkToPem(key);

		const decoded = jwt.verify(token, pem);
		if (!decoded["custom:role"] === "admin") {
			return generatePolicy("user", "Deny", event.methodArn);
		}
		return generatePolicy(decoded.sub, "Allow", event.methodArn, {
			role: decoded["custom:role"],
			email: decoded.email,
			userId: decoded.sub,
		});
	} catch (err) {
		console.log(err);
		return generatePolicy("user", "Deny", event.methodArn);
	}
};

export const getCognitoKeys = async () => {
	const response = await ky.get(
		`https://cognito-idp.ap-south-1.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`
	);
	const { keys } = await response.json();
	return keys;
};

const generatePolicy = (principalId, effect, resource, context) => {
	const policy = {
		principalId,
		policyDocument: {
			Version: "2012-10-17",
			Statement: [
				{
					Action: "execute-api:Invoke",
					Effect: effect,
					Resource: resource,
				},
			],
		},
	};

	// Include context if provided
	if (context) {
		policy.context = context;
	}

	return policy;
};
