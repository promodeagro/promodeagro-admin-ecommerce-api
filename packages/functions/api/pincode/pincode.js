import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	changeActiveStatus,
	changeDeliveryType,
	createPincode,
	deliveryTypes,
	updatePincode,
	list,
	searchPincodes,
} from ".";
import { authorizer } from "../auth/middleware";
import crypto from "crypto";

// Helper functions for date and time formatting
const getCurrentDate = () => {
	const now = new Date();
	return now.toISOString().split("T")[0]; // YYYY-MM-DD format
};

// Formats a date object or time string to 12-hour time (e.g., 03:00 PM)
const formatTime12Hour = (time) => {
	let hours, minutes;

	// Check if input is a date object or time string (e.g., "15:00")
	if (time instanceof Date) {
		hours = time.getHours();
		minutes = time.getMinutes();
	} else if (typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time)) {
		[hours, minutes] = time.split(":").map(Number);
	} else {
		throw new Error("Invalid time format. Must be a Date object or 'HH:MM' string.");
	}

	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12; // Convert 24-hour to 12-hour format, '0' becomes '12'
	minutes = minutes.toString().padStart(2, "0");

	return `${hours}:${minutes} ${ampm}`;
};

// Determines AM or PM based on the shift name (e.g., "Morning", "Afternoon")
const getAMPM = (shiftName) => {
	const lowerShift = shiftName.toLowerCase();
	if (lowerShift.includes("morning")) return "AM";
	if (lowerShift.includes("afternoon") || lowerShift.includes("evening")) return "PM";
	return "AM"; // Default to AM if no match
};

// Helper function to handle slot processing and AM/PM logic
const processShifts = (shifts) => {
	return shifts.map((shift) => ({
		...shift,
		name: shift.name.toLowerCase(),
		slots: shift.slots.map((slot) => {
			// If slot ID is missing, generate a new ID (for new slots)
			if (!slot.id) {
				slot.id = crypto.randomUUID();
			}

			// Parse and format start/end times properly
			slot.start = formatTime12Hour(slot.start || "00:00"); // Default to midnight if not provided
			slot.end = formatTime12Hour(slot.end || "00:00");
			slot.startAmPm = slot.start.split(" ")[1]; // Extract AM/PM
			slot.endAmPm = slot.end.split(" ")[1]; // Extract AM/PM

			return slot;
		}),
	}));
};

// Zod schema for validating pincode creation and updates
const pincodeSchema = z.object({
	pincode: z.string(),
	deliveryType: z.enum(deliveryTypes),
	active: z.boolean().default(true),
	dateAdded: z.string().default(getCurrentDate),
	shifts: z.array(
		z.object({
			name: z.string(),
			slots: z.array(
				z.object({
					start: z.string().default(formatTime12Hour("00:00")),
					end: z.string().default(formatTime12Hour("00:00")),
					startAmPm: z.string().optional().default("AM"),
					endAmPm: z.string().optional().default("PM"),
					id: z.string().optional(), // slotId is optional for new slots
				})
			),
		})
	),
});

// Handler for creating a new pincode
export const createPincodeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);

	// Pre-process shifts to handle missing slotIds (i.e., create new slots if no slotId)
	req.shifts = processShifts(req.shifts);

	// Validate the schema after processing
	pincodeSchema.parse(req);

	// Create pincode in the database
	return await createPincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

// Handler for updating an existing pincode
export const updatePincodeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);

	// Pre-process shifts to handle missing slotIds for updates and new shifts
	req.shifts = processShifts(req.shifts);

	// Validate the schema after processing
	pincodeSchema.parse(req);

	// Update pincode in the database
	return await updatePincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

// Schema for changing the active status of a pincode
const changeActiveStatusSchema = z
	.object({
		status: z.boolean(),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide at least one pincode",
	});

// Handler for changing the active status of a pincode
export const changeActiveStatusHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeActiveStatus(req);
})
	.use(bodyValidator(changeActiveStatusSchema))
	.use(errorHandler());

// Schema for changing the delivery type of a pincode
const changeDeliveryTypeSchema = z
	.object({
		type: z.enum(deliveryTypes),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide at least one pincode",
	});

// Handler for changing the delivery type of a pincode
export const changeDeliveryTypeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeDeliveryType(req);
})
	.use(bodyValidator(changeDeliveryTypeSchema))
	.use(errorHandler());

// Handler for listing pincodes with optional filters
export const listhandler = middy(async (event) => {
	let search = event.queryStringParameters?.search || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let type = event.queryStringParameters?.type || undefined;
	if (search) {
		return await searchPincodes(search);
	}
	return await list(status, type);
}).use(errorHandler());
