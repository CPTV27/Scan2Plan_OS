import crypto from "crypto";

/**
 * Replit Connector Utilities
 * 
 * Centralizes logic for connecting to Replit-hosted services (Google, HubSpot, etc.)
 * via Replit's connector infrastructure.
 */

export interface ReplitConnectorHeaders {
    hostname: string | undefined;
    xReplitToken: string;
}

/**
 * Creates headers required for Replit connector requests
 */
export function createReplitConnectorHeaders(): ReplitConnectorHeaders {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
        ? 'repl ' + process.env.REPL_IDENTITY
        : process.env.WEB_REPL_RENEWAL
            ? 'depl ' + process.env.WEB_REPL_RENEWAL
            : '';

    return { hostname, xReplitToken };
}

/**
 * Gets the base URL for the application
 * Handles various Replit deployment scenarios
 */
export function getBaseUrl(): string {
    // Development domain (preferred)
    if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }

    // Deployment URL
    if (process.env.REPLIT_DEPLOYMENT_URL) {
        return process.env.REPLIT_DEPLOYMENT_URL;
    }

    // Legacy Repl.co domain
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    }

    // Fallback to localhost
    return 'http://localhost:5000';
}

/**
 * Generates a webhook signature for verification
 */
export function generateWebhookSignature(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Verifies a webhook signature using timing-safe comparison
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = generateWebhookSignature(payload, secret);

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}
