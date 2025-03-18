import { join } from 'node:path'
import winston from 'winston'

export const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: join(__dirname, 'logs', 'combined.log'),
    }),
  ],
})
