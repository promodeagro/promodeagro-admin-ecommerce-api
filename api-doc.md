# API Documentation

## Overview

This document provides detailed information about the available API endpoints, including HTTP verbs, routes, path parameters, query parameters, and other relevant details.

## Endpoints

### Inventory Endpoints

#### 1. Get All Inventory Items

-   **HTTP Verb:** GET
-   **Route:** `/inventory`
-   **Description:** Retrieves all inventory items.
-   **Path Parameters:** None
-   **Query Parameters**
    -   `search` (optional): A search term to filter inventory items by name.
    -   `category` (optional): A category to filter inventory items.
    -   `active` (optional): A active to filter inventory items either true or false.
    -   `pageKey` (optional): A key to fetch the next set of results for pagination.

#### 2. Get Inventory Item by ID

-   **HTTP Verb:** GET
-   **Route:** `/inventory/{id}`
-   **Description:** Retrieves a specific inventory item by its ID.
-   **Path Parameters:**
    -   `id` (string): The ID of the inventory item.
-   **Query Parameters:** None

#### 3. Get Inventory Stats

-   **HTTP Verb:** GET
-   **Route:** `/inventory/stats`
-   **Description:** Retrieves statistics about the inventory.
-   **Path Parameters:** None
-   **Query Parameters:** None

#### 4. Add Inventory Item

-   **HTTP Verb:** POST
-   **Route:** `/inventory`
-   **Description:** Adds a new item to the inventory.
-   **Path Parameters:** None
-   **Query Parameters:** None
-   **Request Body:** JSON object representing the new inventory item.
    ```json
    {
    	"name": "Red Apples",
    	"description": "Fresh red apples from local farms.",
    	"category": "Fruit",
    	"units": "pieces",
    	"purchasingPrice": 1.99,
    	"msp": 2.49,
    	"stockQuantity": 100,
    	"expiry": "2024-12-31T00:00:00Z",
    	"images": ["https://example.com/images/apple1.jpg"]
    }
    ```

#### 5. Update Inventory Item Status

-   **HTTP Verb:** PUT
-   **Route:** `/inventory/status`
-   **Description:** Updates the status of an inventory item.
-   **Path Parameters:** None
-   **Query Parameters:** None
-   **Request Body:** JSON object containing the status update.
    ```json
    [
    	{
    		"id": "1b69ac5b-c12b-43fa-a896-c90503c64e6f",
    		"active": false
    	},
    	{
    		"id": "e41d508a-3c43-4672-b086-5883f6bb2927",
    		"active": true
    	}
    ]
    ```

#### 6. Update Inventory Item/Product

-   **HTTP Verb:** PUT
-   **Route:** `/inventory/{id}`
-   **Description:** Updates the details of a specific inventory item.
-   **Path Parameters:** `{id}`
-   **Query Parameters:** None
-   **Request Body:**
    ```json
    {
    	"name": "Cauliflower",
    	"description": "Fresh cauliflower from the farm",
    	"category": "Fresh Vegetables",
    	"subCategory": "Vegetables",
    	"units": "pieces",
    	"expiry": "2024-12-31T23:59:59Z"
    }
    ```

#### 6. Update Inventory Item Price

-   **HTTP Verb:** PUT
-   **Route:** `/inventory/price`
-   **Description:** Updates the price of a specific inventory item.
-   **Path Parameters:**
-   **Query Parameters:** None
-   **Request Body:**
    ```json
    [
    	{
    		"id": "1db750d8-7635-4f4d-a70a-e1380530bbec",
    		"compareAt": 100.0,
    		"onlineStorePrice": 80.0
    	},
    	{
    		"id": "a5a0ccc1-8dad-4255-b636-fad1f2cab432",
    		"compareAt": 120.0,
    		"onlineStorePrice": 90.0
    	}
    ]
    ```

### Media Endpoints

#### 1. Get Pre-Signed S3 URL

-   **HTTP Verb:** GET
-   **Route:** `/uploadUrl`
-   **Description:** Retrieves a pre-signed URL for uploading media to S3.
-   **Path Parameters:** None
-   **Query Parameters:** None

### Order Endpoints

#### 1. Get All Orders

-   **HTTP Verb:** GET
-   **Route:** `/order`
-   **Description:** Retrieves all orders.
-   **Path Parameters:** None
-   **Query Parameters:** - `search` (optional): A search term to filter inventory items by name. - `status` (string): filter for orders by status - `pageKey` (string): The key of the page for pagination

#### Get All Orders for inventory

-   **HTTP Verb:** GET
-   **Route:** `/order-inventory`
-   **Description:** Retrieves all orders.
-   **Path Parameters:** None
-   **Query Parameters:** - `search` (optional): A search term to filter inventory items by name. - `type` (string): filter for orders by type cash or online - `pageKey` (string): The key of the page for pagination

#### 1. Orders-filter

-   **HTTP Verb:** GET
-   **Route:** `/order-filter`
-   **Description:** Retrieves orders data.
-   **Path Parameters:** None
-   **Query Parameters:** - `filter` (string): filter for last 7 day old,14 Days old, 1 months old,2 months old, old orders.

#### 2. Get Order by ID

-   **HTTP Verb:** GET
-   **Route:** `/order/{id}`
-   **Description:** Retrieves a specific order by its ID.
-   **Path Parameters:**
    -   `id` (string): The ID of the order.
-   **Query Parameters:** None

#### 3. Get Order Stats

-   **HTTP Verb:** GET
-   **Route:** `/order/stats`
-   **Description:** Retrieves statistics about the orders.
-   **Path Parameters:** None
-   **Query Parameters:** None

#### 4. Proceed Order by ID

-   **HTTP Verb:** GET
-   **Route:** `/order/{id}/proceed`
-   **Description:** Proceeds with the order processing for a specific order by its ID.
-   **Path Parameters:**
    -   `id` (string): The ID of the order.
-   **Query Parameters:** None

#### 5. cancel order

-   **HTTP Verb:** PUT
-   **Route:** `/order/{id}/cancel`
-   **Description:** cancels the order.
-   **Path Parameters:**
    -   `id` (string): The ID of the order.
-   **Query Parameters:** None
-   **Request Body:** {reson : 'reason for cancellation'}

### POST /auth/signin

-   **HTTP Verb:** POST

-   **Route:** `/auth/signin`

-   **Description:** Authenticates a user and returns an access token and refresh token.

-   **Request Body:**

    ```json
    {
    	"email": "user@example.com",
    	"password": "userpassword"
    }
    ```

-   **Response:**

    ```json
    {
    	"accessToken": "access-token-string",
    	"refreshToken": "refresh-token-string"
    }
    ```

### POST /auth/forgot-password

-   **HTTP Verb:** POST

-   **Route:** `/auth/forgot-password`

-   **Description:** Initiates the password reset process for a user.

-   **Request Body:**

    ```json
    {
    	"email": "user@example.com"
    }
    ```

-   **Response:**

    ```json
    {
    	"message": "Password reset instructions have been sent to your email."
    }
    ```

### POST /auth/reset-password

-   **HTTP Verb:** POST

-   **Route:** `/auth/reset-password`

-   **Description:** Resets the password for a user using a confirmation code.

-   **Request Body:**

    ```json
    {
    	"email": "user@example.com",
    	"confirmationCode": "confirmation-code-string",
    	"newPassword": "newuserpassword"
    }
    ```

-   **Response:**

    ```json
    {
    	"message": "Your password has been reset successfully."
    }
    ```

### POST /inventory/adjust

Adjust the inventory for a list of items.

### Request Body

The request body must be a JSON object with the following structure:

```json
{
	"reason": "string",
	"description": "string",
	"location": "string",
	"items": [
		{
			"id": "string",
			"itemCode": "string",
			"name": "string",
			"stock": "integer",
			"currentCompareAtPrice": "number",
			"currentOnlineStorePrice": "number",
			"adjustQuantity": "integer",
			"newPurchasingPrice": "number",
			"newOnlineStorePrice": "number"
		}
	]
}
```

#### Get All Inventory adjustment Items

-   **HTTP Verb:** GET
-   **Route:** `/inventory/adjust`
-   **Description:** Retrieves all inventory adjust items.
-   **Path Parameters:** None
-   **Query Parameters:** None

## Notes

-   All endpoints are secured and require appropriate permissions.
-   Ensure to handle errors and exceptions as per the organization's best practices.
-   Refer to the internal documentation for detailed request and response schemas.

## **Create Runsheet**

**POST** `/runsheet`

Creates a new runsheet for a rider.

**Request Body:**

```json
{
	"riderId": "123e4567-e89b-12d3-a456-426614174000",
	"orders": [
		"123e4567-e89b-12d3-a456-426614174001",
		"123e4567-e89b-12d3-a456-426614174002"
	]
}
```

**Response:**

-   **Status 200:**

    ```
    json
    ```

    `{ "message": "created runsheet successfully" }`

-   **Status 400:**

    ````json
    { "message": "rider does not exist" }```
    ````

---

## **List Runsheets**

**GET** `/runsheet`

Retrieves a list of runsheets. Supports pagination through the `pageKey` query parameter.

**Query Parameters:**

| Parameter | Type   | Description                                 |
| --------- | ------ | ------------------------------------------- |
| pageKey   | string | (Optional) Key for the next page.           |
| search    | string | (Optional) name of rider or id of runsheet. |

**Response:**

-   **Status 200:**

```json
[
	{
		"id": "abc123",
		"riderId": "123e4567-e89b-12d3-a456-426614174000",
		"status": "pending",
		"orders": [
			"123e4567-e89b-12d3-a456-426614174001",
			"123e4567-e89b-12d3-a456-426614174002"
		],
		"name": "John Doe"
	}
]
```

---

## **Get Runsheet by ID**

**GET** `/runsheet/{id}`

Fetches a specific runsheet by its ID.

**Path Parameters:**

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the runsheet |

**Response:**

-   **Status 200:**

    ```
    json
    ```

    `{ "id": "abc123", "riderId": "123e4567-e89b-12d3-a456-426614174000", "status": "pending", "orders": [ "123e4567-e89b-12d3-a456-426614174001", "123e4567-e89b-12d3-a456-426614174002" ] }`

-   **Status 400:**

    ```
    json
    ```

    `{ "message": "id is required" }`

    ```

    ```

## Get Runsheet Cash Collection List

**GET** `/runsheet/cash-collection`

## Description

Retrieves a list of cash collection runsheets with their associated order statuses and rider details. The response includes the count of delivered orders out of the total orders in each runsheet.

## Query Parameters

| Parameter | Type   | Required | Description                                                                                                           |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `pageKey` | String | No       | A pagination token to fetch the next set of results. If not provided, the request retrieves the first set of results. |
| `status`  | String | No       | can be 'active' or 'pending'. if neither of it or invalid is provied default sets to pending                          |
| `search`  | String | No       | takes the id of the runsheet or name of the rider(Casesensitive) runsheet assigned to                                 |

## **Close Runsheet by ID**

**PUT** `/runsheet/{id}/close`

closes a specific runsheet by its ID.

**Path Parameters:**

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the runsheet |

**Response:**

-   **Status 200:**

    ```
    json
    ```

    `{
    "riderId": "b452a1fe-694d-430b-ae06-5c5ec5c7cece",
    "orders": [
        "401-3385984-2549139",
        "401-6484620-3193625",
        "401-4172601-3242039",
        "401-8100022-9359713",
        "401-4722680-4109619"
    ],
    "amountCollected": 6000,
    "updatedAt": "2024-10-15T07:47:51.014Z",
    "amountCollectable": 6274,
    "status": "closed",
    "createdAt": "2024-10-15T07:47:51.014Z",
    "id": "655df2d3ef0b"
}`

-   **Status 400:**

    ```
    json
    ```

    `{ "message": "id is required" }`

    ```

    ```

## List Riders

**GET** `/rider`

**Description**: Retrieves a list of riders filtered by their review status.

**Query Parameters**:

-   `status` (optional): The review status to filter riders. If not provided, defaults to `"active"`.
-   `pageKey` (optional): The key for pagination. Used to retrieve the next set of results.

**Response**:

-   **200 OK**: Returns an object containing the count of riders, the list of riders, and the next pagination key.

**Example Request**:

GET /rider?status=active\&pageKey=12345

```json
{ "count": 10, "items": [ { "id": "1", "userPhoto": "https://example.com/user-photo.jpg", "verified": false, "reviewStatus": "active" }, // More riders... ], "nextKey": "67890" }
```

---

## Get Rider

**GET** `/rider/{id}`

**Description**: Retrieves details of a specific rider by their ID.

**Path Parameters**:

-   `id`: The unique identifier of the rider.

**Response**:

-   **200 OK**: Returns the rider details.

-   **400 Bad Request**: If the ID is not provided.

**Example Request**:

`GET /rider/1`

**Example Response**:

```
json
```

`{ "id": "1", "userPhoto": "https://example.com/user-photo.jpg", "verified": false, "reviewStatus": "active" }`

---

## PATCH `/rider/{id}`

**Description:**\
This endpoint is used to activate or reject a rider based on the provided status.

### Request

-   **Method:** PATCH

-   **Path Parameters:**

    -   `id` (string): The unique identifier of the rider.

-   **Body:**

    ```
    json
    ```

    Copy code

    `{ "status": "active" |"inactive" |"rejected", "reason": "string (optional, required if status is rejected)" }`

### Response

**Success:**

-   **Status Code:** 200

-   **Body:**

    ```
    json
    ```

    Copy code

    `{ "message": "Rider status updated successfully" }`

**Error Cases:**

-   **400 Bad Request:**

    ```
    json
    ```

    Copy code

    `{ "message": "id is required" }`

-   **404 Not Found:**

    ```
    json
    ```

    Copy code

    `{ "message": "rider not found" }`

---

## PATCH `/rider/{id}/document`

**Description:**\
This endpoint is used to verify or reject a specific document for a rider.

### Request

-   **Method:** PATCH

-   **Path Parameters:**

    -   `id` (string): The unique identifier of the rider.

-   **Query Parameters:**

    -   `name` (string): The name of the document. Must be one of:

        -   `userPhoto`

        -   `aadharFront`

        -   `aadharBack`

        -   `pan`

        -   `dl`

        -   `vehicleImage`

        -   `rcBook`

-   **Body:**

    ```
    json
    ```

    Copy code

    `{ "status": "verified" | "rejected", "reason": "string (optional, required if status is rejected)" }`

### Response

**Success:**

-   **Status Code:** 200

-   **Body:**

    ```
    json
    ```

    Copy code

    `{ "message": "Document status updated successfully" }`

**Error Cases:**

-   **400 Bad Request:**

    ```
    json
    ```

    Copy code

    `{ "message": "id is required" }`

-   **404 Not Found:**

    ```
    json
    ```

    Copy code

    `{ "message": "rider not found" }`

## POST `/pincode`

### Description

Creates a new pincode with delivery details, shifts, and delivery type.

### Request Body

```
json
```

Copy code

`{ "pincode": "string", "deliveryType": "same day | next day", "shifts": [ { "name": "string", "slots": [ { "start": "HH:MM:SS", "end": "HH:MM:SS" } ] } ] }`

### Responses

-   **200 OK**: Pincode created successfully.

-   **400 Bad Request**: Pincode already exists.

### Example Response

```
json
```

Copy code

`{ "pincode": "12345", "deliveryType": "next day", "shifts": [ { "name": "Morning", "slots": [ { "start": "08:00:00", "end": "12:00:00" } ] } ] }`

---

## PUT `/pincode`

### Description

Updates an existing pincode's details.

### Request Body

Use the same schema as for creating a pincode.

```
json
```

Copy code

`{ "pincode": "string", "deliveryType": "same day | next day", "shifts": [ { "name": "string", "slots": [ { "start": "HH:MM:SS", "end": "HH:MM:SS" } ] } ] }`

### Responses

-   **200 OK**: Pincode updated successfully.

-   **404 Not Found**: Pincode does not exist.

---

## PATCH `/pincode/status`

### Description

Updates the active status of multiple pincodes.

### Request Body

```
json
```

Copy code

`{ "status": "active | inactive", "pincodes": ["string"] }`

-   `status`: `"active"` or `"inactive"`

-   `pincodes`: Array of pincode strings.

### Responses

-   **200 OK**: Status updated successfully.

-   **400 Bad Request**: Request validation failed (e.g., empty pincodes array).

---

## PATCH `/pincode/delivery-type`

### Description

Updates the delivery type for multiple pincodes.

### Request Body

```
json
```

Copy code

`{ "type": "same day | next day", "pincodes": ["string"] }`

-   `type`: `"same day"` or `"next day"`

-   `pincodes`: Array of pincode strings.

### Responses

-   **200 OK**: Delivery type updated successfully.

-   **400 Bad Request**: Request validation failed (e.g., empty pincodes array).

---

## GET `/pincode`

### Description

Retrieves a list of all pincodes, or filters based on a search query.

### Query Parameters

-   `search` (optional): Search query string to filter pincodes.

### Responses

-   **200 OK**: Returns an array of pincodes matching the query.

### Example Response

```
json
```

Copy code

`[ { "pincode": "12345", "deliveryType": "next day", "shifts": [ { "name": "Morning", "slots": [ { "start": "08:00:00", "end": "12:00:00" } ] } ], "active": true }, { "pincode": "67890", "deliveryType": "same day", "shifts": [ { "name": "Evening", "slots": [ { "start": "15:00:00", "end": "20:00:00" } ] } ], "active": false } ]`
