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
export interface Product {
  _id?: ObjectId | string;
  id: number;
  title?: string;
  description?: string;
  price?: number;
  rating?: number;
  category?: string;
  stock?: number;
  brand?: string;
  thumbnail?: string;
  images?: string[];
  vendorId?: string; // --- ADDED: To link the product to a vendor ---
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