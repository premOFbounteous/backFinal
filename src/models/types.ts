import { ObjectId } from "mongodb";

// --- NEW: VENDOR INTERFACE ---
export interface VendorDoc {
  _id?: ObjectId;
  companyName: string;
  email: string;
  password: string;
  vendor_id: string; // Unique ID for the vendor
  createdAt: Date;
}

// --- UPDATED: PRODUCT INTERFACE ---
// export interface Product {
//   _id?: ObjectId | string;
//   id: number;
//   title?: string;
//   description?: string;
//   price?: number;
//   rating?: number;
//   category?: string;
//   stock?: number;
//   brand?: string;
//   thumbnail?: string;
//   vendorId?: string; // --- ADDED: To link the product to a vendor ---
// }
/**
 * Represents the data a vendor needs to provide when creating or updating a product.
 * This is designed to be simple and map directly to a form.
 */
export interface Product {
  _id?: ObjectId | string;
  id: number;
  // --- Core Details ---
  title: string;
  description: string;
  /** This should be a dropdown list in the UI, populated from your system's categories. */
  category: string; 
  price: number;
  /** A vendor can optionally set a discount. Defaults to 0 if not provided. */
  discountPercentage?: number;

  // --- Inventory & SKU ---
  stock: number;
  /** Stock Keeping Unit. A unique ID for the product in the vendor's system. */
  sku: string;
  /** Keywords to help customers find the product. Should be a tag input field. */
  tags?: string[];
  brand: string;
  rating: number;

  // --- Shipping Details ---
  /** Weight of the product in kilograms. */
  weight: number; 
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };

  // --- Logistics & Policies ---
  warrantyInformation: string;
  shippingInformation: string;
  returnPolicy: string;
  /** The minimum number of items a customer must order. Defaults to 1. */
  minimumOrderQuantity?: number;

  // --- Media ---
  /** An array of image URLs. The vendor will upload files, and you'll convert them to URLs. */
  images: string[];
  thumbnail?: string;
  vendorId: string;
}

// --- UPDATED: JWT PAYLOAD ---
export type JWTPayload = {
  user_id?: string;  // For regular users
  vendor_id?: string; // For vendors
  role: 'user' | 'vendor'; // To distinguish between token types
};


// ... (Other interfaces like Address, UserDoc, Cart, OrderDoc remain the same)
export interface Address {
  _id: ObjectId;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserDoc {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  user_id: string;
  DOB: Date;
  addresses: Address[];
  created_at: Date;
}

export interface CartItem {
  product_id: number;
  quantity: number;
}
export interface Cart {
  _id?: ObjectId;
  user_id: string;
  items: CartItem[];
}
export interface OrderItem {
  product_id: number;
  title?: string;
  price?: number;
  quantity: number;
  thumbnail?: string;
}
export interface OrderDoc {
  _id?: ObjectId;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "paid" | "failed";
  createdAt: Date;
  stripe_session_id?: string;
  shippingAddress: Address;
}
export interface Wishlist {
  _id?: ObjectId;
  user_id: string;
  items: number[];
}
