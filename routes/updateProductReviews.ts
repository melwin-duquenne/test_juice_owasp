/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as db from '../data/mongodb'

// vuln-code-snippet start noSqlReviewsChallenge forgedReviewChallenge
export function updateProductReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = security.authenticatedUsers.from(req)
    const id = req.body.id
    const message = req.body.message

    // Validate id as a valid MongoDB ObjectId (24 hex chars)
    if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid review id.' })
    }

    // Sanitize message: remove HTML tags and dangerous characters
    const sanitizedMessage = typeof message === 'string'
      ? message.replace(/<[^>]*>/g, '').replace(/[${}[\];]/g, '')
      : ''

    db.reviewsCollection.update(
      { _id: id },
      { $set: { message: sanitizedMessage } },
      { multi: true }
    ).then(
      (result: { modified: number, original: Array<{ author: any }> }) => {
        challengeUtils.solveIf(challenges.noSqlReviewsChallenge, () => { return result.modified > 1 })
        challengeUtils.solveIf(challenges.forgedReviewChallenge, () => { return user?.data && result.original[0] && result.original[0].author !== user.data.email && result.modified === 1 })
        res.json(result)
      }, (err: unknown) => {
        res.status(500).json(err)
      })
  }
}
// vuln-code-snippet end noSqlReviewsChallenge forgedReviewChallenge
