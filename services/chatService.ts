import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface ChatProduct {
  id: string;
  name: string;
  type: 'badge' | 'sticker' | string;
  price: number;
  description?: string;
  category?: string;
  stock?: number;
  image?: string;
}

export interface CartItemSummary {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  badgeStyle?: string;
  image?: string;
  category?: string;
}

export interface CartSummary {
  items: CartItemSummary[];
  total: number;
  totalItems: number;
}

export interface ChatOrderItem {
  name: string;
  quantity: number;
  price: number;
  badgeStyle?: string;
  image?: string | null;
}

export interface ChatOrder {
  orderId: string;
  orderNumber?: string;
  invoiceNumber?: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | string;
  rawStatus?: string;
  isDelivered?: boolean;
  deliveredAt?: string | null;
  totalAmount: number;
  currency?: string;
  createdAt?: string | null;
  itemCount?: number;
  items?: ChatOrderItem[];
  trackingNumber?: string | null;
  courier?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  products: ChatProduct[];
  cart?: CartSummary | null;
  orders?: ChatOrder[];
  message?: string;
}

/**
 * Send customer message to the backend AI chatbot endpoint with optional user auth token.
 *
 * @param message - User question/message
 * @returns Promise resolving to API response { success, reply, products, cart }
 */
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.post<ChatResponse>(
    `${API_BASE_URL}/api/chat`,
    { message },
    { headers }
  );

  return response.data;
};
