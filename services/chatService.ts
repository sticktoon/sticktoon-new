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

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  products: ChatProduct[];
  cart?: CartSummary | null;
  orders?: ChatOrder[];
  message?: string;
  provider?: string;
  latencyMs?: number;
}

export interface StreamHandlers {
  onChunk: (chunkText: string) => void;
  onDone: (data: ChatResponse) => void;
  onError: (err: any) => void;
}

/**
 * Send customer message to the backend AI chatbot endpoint with optional user auth token and history.
 *
 * @param message - User question/message
 * @param history - Optional recent conversation messages
 * @returns Promise resolving to API response { success, reply, products, cart }
 */
export const sendChatMessage = async (
  message: string,
  history?: ChatHistoryMessage[]
): Promise<ChatResponse> => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.post<ChatResponse>(
    `${API_BASE_URL}/api/chat`,
    { message, history },
    { headers }
  );

  return response.data;
};

/**
 * Stream customer message to backend using Server-Sent Events (SSE) for instant token-by-token response.
 */
export const streamChatMessage = async (
  message: string,
  history: ChatHistoryMessage[] | undefined,
  handlers: StreamHandlers
): Promise<void> => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'chunk') {
              handlers.onChunk(data.text);
            } else if (data.type === 'done') {
              handlers.onDone({
                success: true,
                reply: data.reply,
                products: Array.isArray(data.products) ? data.products : [],
                cart: data.cart || null,
                orders: Array.isArray(data.orders) ? data.orders : [],
                provider: data.provider,
                latencyMs: data.latencyMs,
              });
            } else if (data.type === 'error') {
              handlers.onError(new Error(data.message));
            }
          } catch {
            // ignore partial JSON parse error
          }
        }
      }
    }
  } catch (err) {
    handlers.onError(err);
  }
};
