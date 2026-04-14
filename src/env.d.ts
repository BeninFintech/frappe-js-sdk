/* eslint-disable */

declare global {
  interface Window {
    frappe: {
      boot?: Record<string, unknown>
      [key: string]: unknown
    }
    site_name?: string;
    csrf_token?: string;
    messages: Record<string, string>;
  }
}

export {};
