# API Documentation

## Overview
This document provides detailed information about the available API endpoints, including HTTP verbs, routes, path parameters, query parameters, and other relevant details.

## Endpoints

### Inventory Endpoints

#### 1. Get All Inventory Items
- **HTTP Verb:** GET
- **Route:** `/inventory`
- **Description:** Retrieves all inventory items.
- **Path Parameters:** None
- **Query Parameters**
    - `search` (optional): A search term to filter inventory items by name.
    - `category` (optional): A category to filter inventory items.
    - `active` (optional): A active to filter inventory items either true or fasle.
    - `pageKey` (optional): A key to fetch the next set of results for pagination.

#### 2. Get Inventory Item by ID
- **HTTP Verb:** GET
- **Route:** `/inventory/{id}`
- **Description:** Retrieves a specific inventory item by its ID.
- **Path Parameters:**
  - `id` (string): The ID of the inventory item.
- **Query Parameters:** None

#### 3. Get Inventory Stats
- **HTTP Verb:** GET
- **Route:** `/inventory/stats`
- **Description:** Retrieves statistics about the inventory.
- **Path Parameters:** None
- **Query Parameters:** None

#### 4. Add Inventory Item
- **HTTP Verb:** POST
- **Route:** `/inventory`
- **Description:** Adds a new item to the inventory.
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** JSON object representing the new inventory item.
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
      "images": [
        "https://example.com/images/apple1.jpg"
      ]
    }
   ```

#### 5. Update Inventory Item Status
- **HTTP Verb:** PUT
- **Route:** `/inventory/status`
- **Description:** Updates the status of an inventory item.
- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** JSON object containing the status update.

#### 6. Update Inventory Item Price
- **HTTP Verb:** PUT
- **Route:** `/inventory/price`
- **Description:** Updates the price of a specific inventory item.
- **Path Parameters:**
- **Query Parameters:** None
- **Request Body:**
    ```json
      [
        {
          "id": "1db750d8-7635-4f4d-a70a-e1380530bbec",
          "compareAt": 100.00,
          "onlineStorePrice": 80.00
        },
        {
          "id": "a5a0ccc1-8dad-4255-b636-fad1f2cab432",
          "compareAt": 120.00,
          "onlineStorePrice": 90.00
        }
      ]
    ```

### Media Endpoints

#### 1. Get Pre-Signed S3 URL
- **HTTP Verb:** GET
- **Route:** `/uploadUrl`
- **Description:** Retrieves a pre-signed URL for uploading media to S3.
- **Path Parameters:** None
- **Query Parameters:** None

### Order Endpoints

#### 1. Get All Orders
- **HTTP Verb:** GET
- **Route:** `/order`
- **Description:** Retrieves all orders.
- **Path Parameters:** None
- **Query Parameters:** 
      - `search` (optional): A search term to filter inventory items by name.
      - `status` (string): filter for orders by status
      - `pageKey` (string): The key of the page for pagination


#### 1. Orders-filter
- **HTTP Verb:** GET
- **Route:** `/order-filter`
- **Description:** Retrieves orders data.
- **Path Parameters:** None
- **Query Parameters:** 
      - `filter` (string): filter for last 7 day old,14 Days old, 1 months old,2 months old, old orders.

#### 2. Get Order by ID
- **HTTP Verb:** GET
- **Route:** `/order/{id}`
- **Description:** Retrieves a specific order by its ID.
- **Path Parameters:**
  - `id` (string): The ID of the order.
- **Query Parameters:** None

#### 3. Get Order Stats
- **HTTP Verb:** GET
- **Route:** `/order/stats`
- **Description:** Retrieves statistics about the orders.
- **Path Parameters:** None
- **Query Parameters:** None

#### 4. Proceed Order by ID
- **HTTP Verb:** GET
- **Route:** `/order/{id}/proceed`
- **Description:** Proceeds with the order processing for a specific order by its ID.
- **Path Parameters:**
  - `id` (string): The ID of the order.
- **Query Parameters:** None

### POST /auth/signin

* **HTTP Verb:** POST

* **Route:** `/auth/signin`

* **Description:** Authenticates a user and returns an access token and refresh token.

* **Request Body:**

    ```json
    {
        "email": "user@example.com",
        "password": "userpassword"
    }
    ```

* **Response:**

    ```json
    {
        "accessToken": "access-token-string",
        "refreshToken": "refresh-token-string"
    }
    ```

### POST /auth/forgot-password

* **HTTP Verb:** POST

* **Route:** `/auth/forgot-password`

* **Description:** Initiates the password reset process for a user.

* **Request Body:**

    ```json
    {
        "email": "user@example.com"
    }
    ```

* **Response:**

    ```json
    {
        "message": "Password reset instructions have been sent to your email."
    }
    ```


### POST /auth/reset-password

* **HTTP Verb:** POST

* **Route:** `/auth/reset-password`

* **Description:** Resets the password for a user using a confirmation code.

* **Request Body:**

    ```json
    {
        "email": "user@example.com",
        "confirmationCode": "confirmation-code-string",
        "newPassword": "newuserpassword"
    }
    ```

* **Response:**

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
- **HTTP Verb:** GET
- **Route:** `/inventory/adjust`
- **Description:** Retrieves all inventory adjust items.
- **Path Parameters:** None
- **Query Parameters:** None

## Notes
- All endpoints are secured and require appropriate permissions.
- Ensure to handle errors and exceptions as per the organization's best practices.
- Refer to the internal documentation for detailed request and response schemas.
