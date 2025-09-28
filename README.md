# Express E-commerce Backend API

This is a robust backend API for an e-commerce application built with Node.js, Express, and MongoDB. It provides a complete set of features including user authentication with JWT, product management, a shopping cart system, and order processing. The project is written in TypeScript and follows a structured, modular pattern for easy maintenance and scalability.

## Project Structure

```
my-express-app
├── src
│   ├── config          # Configuration files
│   │   └── db.ts      # MongoDB connection setup
│   ├── middlewares     # Middleware functions
│   │   └── auth.ts     # JWT authentication middleware
│   ├── utils           # Utility functions
│   │   ├── jwt.ts      # JWT handling utilities
│   │   └── serialize.ts # Cart serialization utility
│   ├── models          # Data models
│   │   ├── product.ts  # Product interface
│   │   ├── user.ts     # UserDoc interface
│   │   ├── cart.ts     # Cart & CartItem interfaces
│   │   └── order.ts    # OrderDoc & OrderItem interfaces
│   ├── routes          # API routes
│   │   ├── products.ts  # Product-related routes
│   │   ├── users.ts     # User-related routes
│   │   ├── cart.ts      # Cart-related routes
│   │   └── orders.ts    # Order-related routes
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── package.json        # NPM configuration
└── tsconfig.json       # TypeScript configuration
```


## ✨ Key Features

-   **User Authentication**: Secure user registration and login using JSON Web Tokens (JWT).
-   **Product Management**: Full CRUD (Create, Read, Update, Delete) functionality for products.
-   **Shopping Cart**: Persistent shopping cart for each user to add, view, update, and remove items.
-   **Order Management**: System for users to place orders from their cart and view their order history.
-   **Structured Codebase**: Organized into modules for routes, controllers, models, and utilities, making the code clean and easy to understand.
-   **Middleware Security**: Authentication middleware to protect sensitive routes, ensuring only logged-in users can access them.
-   **MongoDB Integration**: Uses Mongoose for elegant and straightforward object data modeling (ODM) with MongoDB.

## 🛠️ Tech Stack

-   **Backend**: Node.js, Express.js
-   **Database**: MongoDB with Mongoose
-   **Language**: TypeScript
-   **Authentication**: JSON Web Tokens (jsonwebtoken)
-   **Password Hashing**: bcryptjs
-   **Development**: ts-node-dev for live reloading

## ✅ Prerequisites

Before you begin, ensure you have the following installed on your local machine:
-   [Node.js](https://nodejs.org/en/) (v14 or newer recommended)
-   [npm](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/)
-   [MongoDB](https://www.mongodb.com/try/download/community) (Make sure the MongoDB server is running)

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### 1. Clone the Repository


git clone [https://github.com/premOFbounteous/backFinal.git](https://github.com/premOFbounteous/backFinal.git)
cd backFinal

### 2. Install Dependencies


npm install

### 3. Set Up Environment Variables

Create a .env file in the root directory of the project. This file will store your secret keys and configuration variables. Copy the contents of .env.example (if present) or use the template below:


# .env

# MongoDB Connection URL
# Replace with your actual MongoDB connection string
MONGO_URI=mongodb://localhost:27017/my-express-app

# JWT Secret Key for signing tokens
JWT_SECRET=your_super_secret_key_that_is_long_and_random

# Port for the server to run on
PORT=3000

### 4. Run the Application

- npm run dev

for build --- npm run build
then to start it --- npm run start

###   5.API Endpoints Documentation


Note: Routes marked with 🔒 (Protected) require a valid JWT to be sent in the Authorization header as a Bearer Token (Authorization: Bearer <your_token>).

👤 User Routes
Method	Endpoint	Description	Authentication
- POST	/api/users/register	Register a new user.	Public
- POST	/api/users/login	Log in an existing user.	Public

📦 Product Routes
Method	Endpoint	Description	Authentication
- GET	/api/products	Get a list of all products.	Public
- GET	/api/products/:id	Get details of a single product.	Public
- POST	/api/products	Create a new product.	🔒 (Protected)
- PUT	/api/products/:id	Update an existing product.	🔒 (Protected)
- DELETE	/api/products/:id	Delete a product.	🔒 (Protected)

🛒 Cart Routes
Method	Endpoint	Description	Authentication
- GET	/api/cart	Get the current user's cart.	🔒 (Protected)
- POST	/api/cart	Add an item to the cart or update its quantity.	🔒 (Protected)
- DELETE	/api/cart/item/:id	Remove an item from the cart.	🔒 (Protected)
- DELETE	/api/cart	Clear all items from the cart.	🔒 (Protected)

🧾 Order Routes
Method	Endpoint	Description	Authentication
- POST	/api/orders	Create a new order from the cart.	🔒 (Protected)
- GET	/api/orders	Get the order history for the user.	🔒 (Protected)
- GET	/api/orders/:id	Get details of a specific order.	🔒 (Protected)


🏪 Vendor Routes
Method	Endpoint	Description	Authentication
- POST	/api/vendors/register	Register a new vendor.	Public
- POST	/api/vendors/login	Log in an existing vendor.	Public
- GET	/api/vendors/products	🔒 Get all products listed by the logged-in vendor.	Vendor Token
- GET	/api/vendors/orders	🔒 Get all orders containing the vendor's products.	Vendor Token

