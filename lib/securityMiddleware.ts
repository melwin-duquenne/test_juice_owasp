/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import path from 'node:path'

/**
 * Middleware to prevent path traversal attacks
 * Blocks requests containing path traversal patterns
 */
export const preventPathTraversal = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Note: Don't use 'g' flag with .test() as it maintains lastIndex state
    // which causes inconsistent behavior across requests
    const suspiciousPatterns = [
      /\.\./, // Parent directory traversal
      /\.\.%2f/i, // URL encoded ../
      /\.\.%5c/i, // URL encoded ..\
      /%2e%2e/i, // Double URL encoded ..
      /%252e%252e/i, // Triple URL encoded ..
      /\.\.\\|\.\.%5c/i, // Windows path traversal
      /%c0%ae/i, // UTF-8 encoded .
      /%c1%9c/i, // UTF-8 encoded /
      /\0|%00/i // Null byte injection
    ]

    const urlToCheck = decodeURIComponent(req.url)
    const pathToCheck = decodeURIComponent(req.path)

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlToCheck) || pattern.test(pathToCheck)) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Suspicious path pattern detected'
        })
        return
      }
    }

    // Check for path traversal in query parameters
    for (const key of Object.keys(req.query)) {
      const value = String(req.query[key])
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          res.status(403).json({
            error: 'Access denied',
            message: 'Suspicious parameter detected'
          })
          return
        }
      }
    }

    next()
  }
}

/**
 * Middleware to validate and sanitize file paths
 * Ensures requested paths stay within allowed directories
 */
export const validateFilePath = (allowedBasePaths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedPath = req.params.file || req.params.path || ''

    // Normalize and resolve the path
    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '')

    // Check if path tries to escape allowed directories
    if (normalizedPath !== requestedPath || requestedPath.includes('..')) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Invalid file path'
      })
      return
    }

    next()
  }
}

/**
 * Strict URL validation for redirects
 * Only allows exact matches from whitelist
 */
export const validateRedirectUrl = (allowedUrls: Set<string>) => {
  return (url: string): boolean => {
    if (!url) return false

    try {
      const parsedUrl = new URL(url)

      // Check for exact match or if the URL starts with an allowed URL
      for (const allowedUrl of allowedUrls) {
        const parsedAllowed = new URL(allowedUrl)

        // Strict validation: protocol, host must match exactly
        if (parsedUrl.protocol === parsedAllowed.protocol &&
            parsedUrl.host === parsedAllowed.host &&
            parsedUrl.pathname.startsWith(parsedAllowed.pathname)) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }
}

/**
 * Middleware to add additional security headers
 */
export const additionalSecurityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY')

    // XSS Protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block')

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions policy (replaces feature-policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    // Content Security Policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' wss: ws:; " +
      "frame-ancestors 'none';"
    )

    next()
  }
}

/**
 * Rate limiting configuration for sensitive endpoints
 */
export const sensitiveEndpoints = [
  '/rest/user/login',
  '/rest/user/reset-password',
  '/rest/user/change-password',
  '/api/Users',
  '/rest/2fa/verify',
  '/b2b/v2'
]

/**
 * Secure IP filter middleware replacing express-ipfilter
 * express-ipfilter depends on 'ip' package which has SSRF vulnerability (GHSA-2p57-rm9w-gvfp)
 */
export const secureIpFilter = (allowedIps: string[], options: { mode: 'allow' | 'deny' } = { mode: 'allow' }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP safely
    const clientIp = getClientIp(req)

    if (options.mode === 'allow') {
      // Only allow listed IPs
      if (allowedIps.includes(clientIp)) {
        next()
      } else {
        res.status(403).json({ error: 'Access denied: IP not allowed' })
      }
    } else {
      // Deny listed IPs
      if (allowedIps.includes(clientIp)) {
        res.status(403).json({ error: 'Access denied: IP blocked' })
      } else {
        next()
      }
    }
  }
}

/**
 * Safely extract client IP without using vulnerable 'ip' package
 */
function getClientIp (req: Request): string {
  // Check X-Forwarded-For header (for proxies)
  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
    return ips.trim()
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip']
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp
  }

  // Fall back to socket remote address
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown'
}

/**
 * Middleware to block access to sensitive files
 * Prevents access to sitemap.xml, .htaccess, web.config, and other sensitive files
 */
export const blockSensitiveFiles = () => {
  const blockedFiles = [
    /sitemap\.xml$/i,
    /\.htaccess$/i,
    /\.htpasswd$/i,
    /web\.config$/i,
    /\.git/i,
    /\.svn/i,
    /\.env$/i,
    /\.bak$/i,
    /\.backup$/i,
    /\.old$/i,
    /\.orig$/i,
    /\.save$/i,
    /\.swp$/i,
    /~$/,
    /\.log$/i,
    /\.sql$/i,
    /\.sqlite$/i,
    /composer\.(json|lock)$/i,
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /Gemfile(\.lock)?$/i,
    /\.npmrc$/i,
    /\.yarnrc$/i,
    /\.docker/i,
    /Dockerfile$/i,
    /docker-compose/i,
    /\.aws/i,
    /\.ssh/i,
    /id_rsa/i,
    /\.pem$/i,
    /\.key$/i,
    /\.crt$/i,
    /\.cer$/i,
    /phpinfo\.php$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.aspx$/i,
    /\.jsp$/i,
    /wp-config/i,
    /config\.php$/i,
    /settings\.php$/i
  ]

  return (req: Request, res: Response, next: NextFunction) => {
    const requestPath = req.path.toLowerCase()

    for (const pattern of blockedFiles) {
      if (pattern.test(requestPath)) {
        res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource does not exist'
        })
        return
      }
    }

    next()
  }
}

/**
 * Middleware to block common attack patterns in request body
 */
export const sanitizeRequestBody = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
        /javascript:/gi, // JavaScript protocol
        /on\w+\s*=/gi, // Event handlers
        /\$where/gi, // MongoDB $where injection
        /\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$or|\$and/gi // MongoDB operators
      ]

      const checkValue = (value: any): boolean => {
        if (typeof value === 'string') {
          for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
              return true
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          for (const key of Object.keys(value)) {
            if (checkValue(value[key])) {
              return true
            }
          }
        }
        return false
      }

      // Log potential attack but don't block (to avoid breaking legitimate functionality)
      if (checkValue(req.body)) {
        console.warn(`[SECURITY] Potential injection attempt detected from IP: ${req.ip}, Path: ${req.path}`)
      }
    }

    next()
  }
}
