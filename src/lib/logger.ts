// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = {
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
  
  info(message: string, data?: any): void {
    console.info(`[INFO] ${message}`, data || '');
  },
  
  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error || '');
  },
  
  logApiRequest(method: string, endpoint: string, params?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API REQUEST] ${method} ${endpoint}`, params || '');
    }
  },
  
  logApiResponse(method: string, endpoint: string, status: number, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API RESPONSE] ${method} ${endpoint} - ${status}`, data || '');
    }
  }
};

export default logger;