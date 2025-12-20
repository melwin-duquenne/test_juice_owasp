/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import config from 'config'

import * as utils from '../lib/utils'

export function errorHandler () {
  return async (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }

    if (req?.headers?.accept === 'application/json') {
      res.status(500).json({ error: JSON.parse(JSON.stringify(error)) })
      return
    }

    const title = `${config.get<string>('application.name')} (Express ${utils.version('express')})`
    // Échappement strict pour HTML
    function escapeHtml(str: string) {
      return str.replace(/[&<>"']/g, function (c) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c] || c
      })
    }
    const safeError = typeof error === 'string'
      ? escapeHtml(error)
      : escapeHtml(JSON.stringify(error, (k, v) => typeof v === 'string' ? escapeHtml(v) : v))
    const safeTitle = escapeHtml(title)
    const html = `<!DOCTYPE html>
<html><head><title>${safeTitle}</title></head><body><h1>${safeTitle}</h1><p class="error-message">${safeError}</p></body></html>`
    res.status(500).send(html)
  }
}
