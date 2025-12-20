/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { URL } from 'node:url'
import { type Request, type Response, type NextFunction } from 'express'

import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import logger from '../lib/logger'

export function profileImageUrlUpload () {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.imageUrl !== undefined) {
      const url = req.body.imageUrl
      // Validation stricte du schéma et du domaine
      const allowedSchemes = ['http:', 'https:']
      const allowedDomains = [
        'trusted1.example.com',
        'trusted2.example.com'
        // Ajouter ici les domaines autorisés
      ]
      let parsedUrl: URL
      try {
        parsedUrl = new URL(url)
      } catch {
        return res.status(400).json({ error: 'URL d\'image non valide.' })
      }
      if (!allowedSchemes.includes(parsedUrl.protocol) || !allowedDomains.includes(parsedUrl.hostname) || url.includes('..')) {
        return res.status(400).json({ error: 'URL d\'image non valide.' })
      }
      if (url.match(/(.)*solve\/challenges\/server-side(.)*/) !== null) req.app.locals.abused_ssrf_bug = true
      const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
      if (loggedInUser) {
        try {
          const response = await fetch(url)
          if (!response.ok || !response.body) {
            throw new Error('url returned a non-OK status code or an empty body')
          }
          // Only allow safe file extensions
          const allowedExts = ['jpg', 'jpeg', 'png', 'svg', 'gif']
          let ext = url.split('.').slice(-1)[0].toLowerCase()
          if (!allowedExts.includes(ext)) ext = 'jpg'
          const filePath = `frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`
          // Prevent path traversal in filePath (should not be possible, but double check)
          if (filePath.includes('..')) {
            return res.status(400).json({ error: 'Chemin de fichier non valide.' })
          }
          const fileStream = fs.createWriteStream(filePath, { flags: 'w' })
          await finished(Readable.fromWeb(response.body as any).pipe(fileStream))
          await UserModel.findByPk(loggedInUser.data.id).then(async (user: UserModel | null) => { return await user?.update({ profileImage: `/assets/public/images/uploads/${loggedInUser.data.id}.${ext}` }) }).catch((error: Error) => { next(error) })
        } catch (error) {
          try {
            const user = await UserModel.findByPk(loggedInUser.data.id)
            // Only allow http(s) URLs for direct link as well, et domaine autorisé
            if (typeof url === 'string' && /^https?:\/\//i.test(url) && !url.includes('..')) {
              if (allowedSchemes.includes(parsedUrl.protocol) && allowedDomains.includes(parsedUrl.hostname)) {
                await user?.update({ profileImage: url })
                logger.warn(`Error retrieving user profile image: ${utils.getErrorMessage(error)}; using image link directly`)
              } else {
                logger.warn('Tentative d\'utilisation d\'une URL d\'image non valide.')
              }
            } else {
              logger.warn('Tentative d\'utilisation d\'une URL d\'image non valide.')
            }
          } catch (error) {
            next(error)
            return
          }
        }
      } else {
        next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
        return
      }
    }
    res.location(process.env.BASE_PATH + '/profile')
    res.redirect(process.env.BASE_PATH + '/profile')
  }
}
