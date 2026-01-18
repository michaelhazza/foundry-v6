const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

function formatLog(entry: LogEntry): string {
  if (isDev) {
    // Pretty print for development
    const { timestamp, level, message, data } = entry;
    const levelColor: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColor[level];
    let output = `${timestamp} ${color}[${level.toUpperCase()}]${reset} ${message}`;
    if (data) {
      output += `\n${JSON.stringify(data, null, 2)}`;
    }
    return output;
  }

  // JSON format for production
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (data !== undefined) {
    entry.data = data;
  }

  const output = formatLog(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      log('debug', message, data);
    }
  },
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};
