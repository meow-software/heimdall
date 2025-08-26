// logger.ts
import winston from 'winston';
import { Request, Response } from 'express';

const APP_NAME = 'HEIMDALL';

// Interface pour les métadonnées supplémentaires
export interface LogMeta {
    [key: string]: any;
}

// Interface étendue pour le logger personnalisé
export interface CustomLogger extends winston.Logger {
    success: (message: string, meta?: LogMeta) => void;
    httpRequest: (req: Request, res: Response, time: number) => void;
}

// Format personnalisé avec emojis et couleurs
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY/MM/DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        // Nettoyer les codes de couleur ANSI
        const cleanLevel = level.replace(/\x1B\[\d+m/g, '');

        const emojiMap: { [key: string]: string } = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            http: '🌐',
            verbose: '🔍',
            debug: '🐛',
            silly: '🎭'
        };

        const emoji = emojiMap[cleanLevel] || '📝';

        return `[${service}] ${timestamp} ${emoji}  ${level} : ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
    })
)
// Création du logger avec le type personnalisé
const logger: CustomLogger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: customFormat,
    defaultMeta: { service: APP_NAME },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        new winston.transports.File({
            filename: `logs/${APP_NAME.toLowerCase()}-error.log`,
            level: 'error',
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.json()
            )
        }),
        new winston.transports.File({
            filename: `logs/${APP_NAME.toLowerCase()}-combined.log`,
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.json()
            )
        })
    ]
}) as CustomLogger;

// Méthodes helper pour une utilisation plus simple
logger.success = (message: string, meta?: LogMeta): void => {
    logger.info(message, { ...meta, type: 'SUCCESS' });
};

logger.httpRequest = (req: Request, res: Response, time: number): void => {
    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} (${time}ms)`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: time,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
        params: req.params
    });
};

export default logger;