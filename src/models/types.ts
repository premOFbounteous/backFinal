import { ObjectId } from "mongodb";

export interface Product {
  _id?: ObjectId | string;
  id: number;
  title?: string;//name
  description?: string;
  price?: number;//price.price
  rating?: number;
  category?: string;
  stock?: number;//stock.quantity
  brand?:string
}

export interface UserDoc {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  user_id: string;
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
}

export interface OrderDoc {
  _id?: ObjectId;
  user_id: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "paid" | "failed";
}

export type JWTPayload = { user_id: string };
