import { env } from './env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const minLevel: LogLevel = env.isProduction ? 'info' : 'debug';

const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  if (levelOrder[level] > levelOrder[minLevel]) return;
  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString()
  };
  // Avoid logging heavy payloads like full text content
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta)
};
