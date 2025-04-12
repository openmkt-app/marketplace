// src/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  // Additional metadata to include with the log
  meta?: Record<string, any>;
  // Whether to also log to the server (if implemented)
  server?: boolean;
}

// Default log level based on environment
const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' 
  ? 'warn'  // Only show warnings and errors in production
  : 'debug'; // Show all logs in development

// Configure which log levels are displayed
let currentLogLevel: LogLevel = DEFAULT_LOG_LEVEL;

// Map log levels to numeric values for comparison
const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[currentLogLevel];
}

/**
 * Format a log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string, options?: LogOptions): string {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Add metadata if provided
  if (options?.meta) {
    try {
      formattedMessage += `\nMetadata: ${JSON.stringify(options.meta, null, 2)}`;
    } catch (e) {
      formattedMessage += `\nMetadata: [Error stringifying metadata]`;
    }
  }
  
  return formattedMessage;
}

/**
 * Log a debug message
 */
export function debug(message: string, options?: LogOptions): void {
  if (!shouldLog('debug')) return;
  
  const formattedMessage = formatLogMessage('debug', message, options);
  console.debug(formattedMessage);
  
  // Additional server logging could be implemented here
  if (options?.server) {
    // Send to server log endpoint
  }
}

/**
 * Log an info message
 */
export function info(message: string, options?: LogOptions): void {
  if (!shouldLog('info')) return;
  
  const formattedMessage = formatLogMessage('info', message, options);
  console.info(formattedMessage);
  
  if (options?.server) {
    // Send to server log endpoint
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, options?: LogOptions): void {
  if (!shouldLog('warn')) return;
  
  const formattedMessage = formatLogMessage('warn', message, options);
  console.warn(formattedMessage);
  
  if (options?.server) {
    // Send to server log endpoint
  }
}

/**
 * Log an error message
 */
export function error(message: string, error?: Error, options?: LogOptions): void {
  if (!shouldLog('error')) return;
  
  let meta = options?.meta || {};
  
  // Include error details if provided
  if (error) {
    meta = {
      ...meta,
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack
    };
  }
  
  const formattedMessage = formatLogMessage('error', message, { ...options, meta });
  console.error(formattedMessage);
  
  if (options?.server) {
    // Send to server log endpoint
  }
}

/**
 * Log a request to the API
 */
export function logApiRequest(
  method: string, 
  endpoint: string, 
  data?: any, 
  options?: LogOptions
): void {
  debug(`API Request: ${method} ${endpoint}`, {
    ...options,
    meta: {
      ...(options?.meta || {}),
      method,
      endpoint,
      data
    }
  });
}

/**
 * Log a response from the API
 */
export function logApiResponse(
  method: string, 
  endpoint: string, 
  status: number, 
  data?: any, 
  options?: LogOptions
): void {
  debug(`API Response: ${method} ${endpoint} (${status})`, {
    ...options,
    meta: {
      ...(options?.meta || {}),
      method,
      endpoint,
      status,
      data
    }
  });
}

// Export the logger as a default object
const logger = {
  debug,
  info,
  warn,
  error,
  setLogLevel,
  logApiRequest,
  logApiResponse
};

export default logger;
