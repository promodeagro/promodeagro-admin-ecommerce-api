
# E-commerce API DOCUMENTATION


<br>
<br>


# USER

## API Endpoint: RegisterUser

This endpoint is used to register user.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/register`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "name": "string",
  "mobileNumber": "string",
  "password":"string"
}
```

### name: The name of the user. Required. 
### mobileNumber: The phone number of the user. Required.
### password: The password of the user. Requires.



## API Endpoint: Login user

This endpoint is used to login user.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/login`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "mobileNumber": "string",
  "password":"string"
}
```

### mobileNumber: The phone number of the user. Required.
### password: The password of the user. Requires.


## API Endpoint: Change User Password

This endpoint is used to change user password.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/changePassword`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId":"string", 
    "oldPassword":"string", 
    "newPassword":"string"
}
```

### userId : The userId the user. Required.
### newPassword: The newPassword of the user. Requires.





## API Endpoint: Forget User Password

This endpoint is used to forget users password.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/forgetPassword`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "mobileNumber": "string",
  "newPassword":"string"
}
```

### mobileNumber: The phone number of the user. Required.
### newPassword: The Newpassword of the user. Requires.



## API Endpoint: update User information

This endpoint is used to update User information.

## Method

- **Method**: PUT

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/updatePersnalDetail`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId":"string",
    "mobileNumber":"string",
    "email":"string",
    "name":"name"
}
```
### userId: The userId of the user. required.
### mobileNumber: The phone number of the user. optional.
### name: The name of the user. optional.
### email: The email of the user. optional.


## API Endpoint: Get User Persnal details

Retrieves Persnal details of user.

## Method

- **Method**: GET

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getPersnalDetails?userId={userId}`  


<br>
<br>
<br>


# Products
<br>

## API Endpoint: add product

create a new product

## Method

- **Method**: POST

## URL

- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/product`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "name": "Organic Vegetable",
    "mrp": 1000,
    "savingsPercentage": 10,
    "about": "High-quality organic vegetable sourced from hyderabad.",
    "images": [
        "iVBORw0KGgoAAAANSUhEUgAAA...<base64-encoded-string>"
    ],
    "imageType": "image/png",
    "description": "These organic vegetable are perfect for healthy snacks and cooking.",
    "unit": "kg",
    "category": "FRUITS",
    "subCategory": "VEGETABLE",
    "availability": "in stock",
    "brand": "Nature's Delight",
    "currency": "USD",
    "ratings": 4.7
}

```

## API Endpoint: Get ProductStats

### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/items/{productId}`


## API Endpoint: Get Items by productId

### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/items/{productId}`


<br>
<br>
<br>

# Inventory


## API Endpoint: Create Inventory

### Method
- **Method**: POST

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/inventory`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
	"name": "Organic Almonds",
	"description": "High-quality organic almonds, rich in nutrients and perfect for healthy snacking.",
	"category": "Dry Fruits",
	"units": "500g",
	"purchasingPrice": 15.99,
	"msp": 19.99,
	"stockQuantity": 100,
	"expiry": "2024-12-31T23:59:59Z",
	"images": "https://example.com/images/almonds.jpg"
}



```

## API Endpoint: Get All Inventory

### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/inventory`


## API Endpoint: Get Inventory by product id

### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/inventory/{id}`



## API Endpoint: Update Inventory status

### Method
- **Method**: PUT

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/inventory/status`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
	"id": "12345",
	"active": true
}

```

<br>
<br>
<br>

# Order

### API Endpoint: Get all order

### Method
### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/order`


### API Endpoint: Get order by id

### Method
### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/order/{id}`


### API Endpoint: Get order stats

### Method
### Method
- **Method**: GET

### URL
- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/order/stats`


# Publish
<br>


## API Endpoint: publish

This endpoint is used to pathParameters update publish id

## Method

- **Method**: PUT

## URL

- **URL**: `https://wj7wzozdcc.execute-api.us-east-1.amazonaws.com/publish/{id}`  
