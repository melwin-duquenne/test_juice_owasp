/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import { finished } from 'node:stream/promises'
import { URL } from 'node:url'
import axios from 'axios'
import { type Request, type Response, type NextFunction } from 'express'

import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import logger from '../lib/logger'

export function profileImageUrlUpload () {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.imageUrl !== undefined) {
      const urlRaw = req.body.imageUrl
      const allowedSchemes = ['http:', 'https:']
      const allowedDomains = [
        'trusted1.example.com',
        'trusted2.example.com'
        // Ajouter ici les domaines autorisés
      ]
      let parsedUrl: URL
      try {
        parsedUrl = new URL(urlRaw)
      } catch {
        return res.status(400).json({ error: 'URL d\'image non valide.' })
      }
      // Validation stricte : schéma, domaine, pas de .., pas de caractères suspects
      if (!allowedSchemes.includes(parsedUrl.protocol) || !allowedDomains.includes(parsedUrl.hostname) || /[^\w\-.:/]/.test(urlRaw) || urlRaw.includes('..')) {
        return res.status(400).json({ error: 'URL d\'image non valide.' })
      }
      if (urlRaw.match(/(.)*solve\/challenges\/server-side(.)*/) !== null) req.app.locals.abused_ssrf_bug = true
      const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
      if (!loggedInUser) {
        next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
        return
      }
      try {
        // Téléchargement sécurisé via axios uniquement si domaine autorisé
        const response = await axios.get(parsedUrl.toString(), { responseType: 'stream', timeout: 5000 })
        if (!response || !response.data) {
          throw new Error('url returned a non-OK status code or an empty body')
        }
        // Only allow safe file extensions
        const allowedExts = ['jpg', 'jpeg', 'png', 'svg', 'gif']
        let ext = parsedUrl.pathname.split('.').slice(-1)[0].toLowerCase()
        if (!allowedExts.includes(ext)) ext = 'jpg'
        const filePath = `frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`
        if (filePath.includes('..')) {
          return res.status(400).json({ error: 'Chemin de fichier non valide.' })
        }
        const fileStream = fs.createWriteStream(filePath, { flags: 'w' })
        await finished(response.data.pipe(fileStream))
        await UserModel.findByPk(loggedInUser.data.id).then(async (user: UserModel | null) => { return await user?.update({ profileImage: `/assets/public/images/uploads/${loggedInUser.data.id}.${ext}` }) }).catch((error: Error) => { next(error) })
      } catch (error) {
        // Si le téléchargement échoue, ne jamais utiliser l'URL brute, logguer et refuser
        logger.warn(`Error retrieving user profile image: ${utils.getErrorMessage(error)}`)
        return res.status(400).json({ error: 'Impossible de récupérer l\'image.' })
      }
    }
    res.location(process.env.BASE_PATH + '/profile')
    res.redirect(process.env.BASE_PATH + '/profile')
  }
}
