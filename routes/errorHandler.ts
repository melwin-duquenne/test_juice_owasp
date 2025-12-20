/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import config from 'config'
import pug from 'pug'

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
    // Template Pug statique sécurisé, compilé à l'avance
    const pugTemplate = `
doctype html
html
  head
    title= title
  body
    h1= title
    p.error-message= error
`
    const fn = pug.compile(pugTemplate, { compileDebug: false, inlineRuntimeFunctions: false })
    // Sanitize l'objet error pour éviter toute injection de contenu dangereux dans le template
    const safeError = typeof error === 'string' ? error.replace(/</g, '&lt;').replace(/>/g, '&gt;') : JSON.stringify(error, (k, v) => typeof v === 'string' ? v.replace(/</g, '&lt;').replace(/>/g, '&gt;') : v)
    res.status(500).send(fn({ title, error: safeError }))
  }
}
