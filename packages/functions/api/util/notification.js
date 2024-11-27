import crypto from "crypto";

export const notification = (id, type, message, meta) => {
	return {
		id: crypto.randomUUID(),
		userId: id,
		type: type,
		message: message,
		read: false,
		createdAt: new Date().toISOString(),
		metadata: meta ? meta : {},
		ttl: Math.floor((Date.now() + 10 * 24 * 60 * 60 * 1000) / 1000),
	};
};
