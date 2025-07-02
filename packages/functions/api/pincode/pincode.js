// import z from "zod";
// import middy from "@middy/core";
// import { bodyValidator } from "../util/bodyValidator";
// import { errorHandler } from "../util/errorHandler";
// import { createPincode, updatePincode, list, searchPincodes } from ".";
// import crypto from "crypto";

// // Helper function to format time into a 24-hour format
// const formatTime24Hour = (time) => {
//   let hours, minutes;

//   if (time instanceof Date) {
//     hours = time.getHours();
//     minutes = time.getMinutes();
//   } else if (typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time)) {
//     [hours, minutes] = time.split(":").map(Number);
//   } else {
//     throw new Error("Invalid time format. Must be a Date object or 'HH:MM' string.");
//   }

//   // Ensure it's in 24-hour format
//   hours = hours % 24; // Adjusting in case of invalid hour inputs
//   minutes = minutes.toString().padStart(2, "0");

//   return `${hours}:${minutes}`;
// };

// // Generate slots for every day in the year (366 days in a leap year, 365 in a regular year)
// const generateYearlySlots = (shifts, year) => {
//   const slots = [];

//   // Loop through all shifts
//   shifts.forEach((shift) => {
//     const shiftSlots = shift.slots.map((slot) => {
//       // For each shift slot, generate slots for every day of the given year
//       const shiftSlotsForYear = [];
//       for (let day = 1; day <= (isLeapYear(year) ? 366 : 365); day++) {
//         const date = new Date(year, 0, day);
//         const dateString = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
//         const newSlot = {
//           ...slot,
//           id: crypto.randomUUID(),
//           date: dateString,
//           start: formatTime24Hour(slot.start || "12:00"),
//           end: formatTime24Hour(slot.end || "12:00"),
//           active: true,
//         };
//         shiftSlotsForYear.push(newSlot);
//       }
//       return {
//         name: shift.name,
//         slots: shiftSlotsForYear,
//       };
//     });
//     slots.push(...shiftSlots);
//   });

//   return slots;
// };

// // Check if a year is a leap year
// const isLeapYear = (year) => {
//   return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
// };

// // Zod schema for validating pincode creation and updates
// const pincodeSchema = z.object({
//   pincode: z.string().nonempty("Pincode is required"),
//   deliveryType: z.enum(["same day", "next day", "scheduled"]),
//   active: z.boolean().default(true),
//   dateAdded: z.string().default(new Date().toISOString().split("T")[0]),
//   shifts: z.array(
//     z.object({
//       name: z.string().nonempty("Shift name is required"),
//       slots: z.array(
//         z.object({
//           start: z.string().default("12:00"),
//           end: z.string().default("12:00"),
//           id: z.string().optional(),
//           date: z.string().optional(),
//           active: z.boolean().default(true),
//         })
//       ),
//     })
//   ),
// });

// // Handler for creating a new pincode
// export const createPincodeHandler = middy(async (event) => {
//   const req = JSON.parse(event.body);

//   // Generate all yearly slots for the given shifts and year (2025)
//   const year = 2025; // You can dynamically pass the year here if needed
//   req.shifts = generateYearlySlots(req.shifts, year);

//   // Validate the schema after processing
//   pincodeSchema.parse(req);

//   // Create pincode in the database
//   return await createPincode(req);
// })
//   .use(bodyValidator(pincodeSchema))
//   .use(errorHandler());

// // Handler for updating an existing pincode
// export const updatePincodeHandler = middy(async (event) => {
//   const req = JSON.parse(event.body);

//   // Generate all yearly slots for the given shifts and year (2025)
//   const year = 2025; // You can dynamically pass the year here if needed
//   req.shifts = generateYearlySlots(req.shifts, year);

//   // Validate the schema after processing
//   pincodeSchema.parse(req);

//   // Update pincode in the database
//   return await updatePincode(req);
// })
//   .use(bodyValidator(pincodeSchema))
//   .use(errorHandler());

// // Handler for listing pincodes with optional filters
// export const listhandler = middy(async (event) => {
//   const { search, status, type } = event.queryStringParameters || {};
//   if (search) {
//     return await searchPincodes(search);
//   }
//   return await list(status, type);
// }).use(errorHandler());

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

const formatTime12Hour = (time) => {
	let hours, minutes;

	if (time instanceof Date) {
		hours = time.getHours();
		minutes = time.getMinutes();
	} else if (typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time)) {
		[hours, minutes] = time.split(":" ).map(Number);
	} else {
		throw new Error("Invalid time format. Must be a Date object or 'HH:MM' string.");
	}

	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	minutes = minutes.toString().padStart(2, "0");

	return `${hours}:${minutes}`;
};

const processShifts = (shifts) => {

	shifts.map((shift) => {
		console.log(shift)
	})
	return shifts.map((shift) => ({
		...shift,
		name: shift.name.toLowerCase(),
		slots: shift.slots.map((slot) => {
			if (!slot.id) {
				slot.id = crypto.randomUUID();
			}
			slot.start = formatTime12Hour(slot.start || "00:00");
			slot.end = formatTime12Hour(slot.end || "00:00");
			slot.startAmPm = slot.startAmPm;
			slot.endAmPm = slot.endAmPm;
			return slot;
		}),
	}));
};

// Updated schema to support multiple delivery types
const pincodeSchema = z.object({
	pincode: z.string(),
	deliveryTypes: z.array(z.enum(deliveryTypes)), // Accept an array of delivery types
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
					id: z.string().optional(),
				})
			),
		})
	),
});

export const createPincodeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	req.shifts = processShifts(req.shifts);

	// Validate the schema after processing
	pincodeSchema.parse(req);

	// Create pincode in the database
	return await createPincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

export const updatePincodeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	req.shifts = processShifts(req.shifts);

	// Validate the schema after processing
	pincodeSchema.parse(req);

	// Update pincode in the database
	return await updatePincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

const changeActiveStatusSchema = z
	.object({
		status: z.boolean(),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide at least one pincode",
	});

export const changeActiveStatusHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeActiveStatus(req);
})
	.use(bodyValidator(changeActiveStatusSchema))
	.use(errorHandler());

const changeDeliveryTypeSchema = z
	.object({
		deliveryTypes: z.array(z.enum(deliveryTypes)),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide at least one pincode",
	});

export const changeDeliveryTypeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeDeliveryType(req);
})
	.use(bodyValidator(changeDeliveryTypeSchema))
	.use(errorHandler());

export const listhandler = middy(async (event) => {
	let search = event.queryStringParameters?.search || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let type = event.queryStringParameters?.type || undefined;
	if (search) {
		return await searchPincodes(search);
	}
	return await list(status, type);
}).use(errorHandler());
