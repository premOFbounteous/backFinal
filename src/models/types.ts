import { ObjectId } from "mongodb";

export interface Address {
  _id: ObjectId;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

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
  thumbnail?: string; // Ensure this is here for consistency
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
  thumbnail?: string; // --- ADDED: To store the image URL with the order item ---
}

export interface OrderDoc {
  _id?: ObjectId;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "paid" | "failed";
  createdAt: Date; // --- ADDED: To store the exact date and time of the order ---
  stripe_session_id?: string; // Good practice to store this from the webhook
}

export interface Wishlist {
  _id?: ObjectId;
  user_id: string;
  items: number[];
}

export type JWTPayload = { user_id: string };