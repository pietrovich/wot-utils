import pino from 'pino';

const level = process.env.DEBUG ? 'debug' : 'info';

export const logger = process.env.LOG_FILE
  ? pino({ level }, pino.destination(process.env.LOG_FILE))
  : pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { destination: 2, colorize: true },
      },
    });
