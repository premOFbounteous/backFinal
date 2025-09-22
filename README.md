# My Express App

This is a simple Express application that demonstrates the use of MongoDB, JWT authentication, and a structured approach to organizing code.

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

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd my-express-app
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Set up MongoDB:**
   Ensure you have MongoDB running and update the connection settings in `src/config/db.ts`.

4. **Run the application:**
   ```
   npx ts-node-dev --transpile-only src/server.ts
   ```

## Usage

- The API provides endpoints for managing products, users, carts, and orders.
- Use tools like Postman or curl to interact with the API.
- Ensure to include the JWT token in the headers for protected routes.

## License

This project is licensed under the MIT License.
