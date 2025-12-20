/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import { type Review } from '../data/types'
import * as db from '../data/mongodb'
import { ObjectId } from 'mongodb'

const sleep = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))

export function likeProductReviews () {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Validation stricte de l’id (ObjectId MongoDB uniquement)
    let objectId: ObjectId | null = null
    if (typeof req.body.id === 'string' && ObjectId.isValid(req.body.id)) {
      objectId = new ObjectId(req.body.id.toString())
    }
    const user = security.authenticatedUsers.from(req)
    if (!user || !objectId) {
      return res.status(401).json({ error: 'Unauthorized or invalid id' })
    }

    // Sanitation de l’email utilisateur (toujours string)
    const safeEmail = (user.data.email || '').toString().replace(/["'\\<>]/g, '')

    try {
      // Utilisation stricte d’ObjectId pour la requête
      const review = await db.reviewsCollection.findOne({ _id: objectId })
      if (!review) {
        return res.status(404).json({ error: 'Not found' })
      }

      const likedBy = Array.isArray(review.likedBy) ? review.likedBy : []
      if (likedBy.includes(safeEmail)) {
        return res.status(403).json({ error: 'Not allowed' })
      }

      await db.reviewsCollection.update(
        { _id: objectId },
        { $inc: { likesCount: 1 } }
      )

      // Artificial wait for timing attack challenge
      await sleep(150)
      try {
        const updatedReview: Review = await db.reviewsCollection.findOne({ _id: objectId })
        const updatedLikedBy = Array.isArray(updatedReview.likedBy) ? updatedReview.likedBy : []
        updatedLikedBy.push(safeEmail)

        const count = updatedLikedBy.filter(email => email === safeEmail).length
        challengeUtils.solveIf(challenges.timingAttackChallenge, () => count > 2)

        const result = await db.reviewsCollection.update(
          { _id: objectId },
          { $set: { likedBy: updatedLikedBy } }
        )
        res.json(result)
      } catch (err) {
        res.status(500).json(err)
      }
    } catch (err) {
      res.status(400).json({ error: 'Wrong Params' })
    }
  }
}
