/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as utils from '../lib/utils'
import * as challengeUtils from '../lib/challengeUtils'
import { type Request, type Response } from 'express'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

export function trackOrder () {
  return (req: Request, res: Response) => {
    // Validation stricte de l’id de commande : alphanumérique et tiret uniquement, conversion explicite et safe
    let id: string | null = null
    if (typeof req.params.id === 'string' && /^[\w-]+$/.test(req.params.id)) {
      // Conversion explicite, sans prototype ni propriétés cachées
      id = String(req.params.id)
    }
    if (!id) {
      res.status(400).json({ error: 'Invalid order id' })
      return
    }

    challengeUtils.solveIf(challenges.reflectedXssChallenge, () => { return utils.contains(id, '<iframe src="javascript:alert(`xss`)">') })
    // Utilisation d'un objet simple, sans héritage ni prototype
    const safeQuery = Object.create(null)
    safeQuery.orderId = id
    db.ordersCollection.find(safeQuery).then((order: any) => {
      const result = utils.queryResultToJson(order)
      challengeUtils.solveIf(challenges.noSqlOrdersChallenge, () => { return result.data.length > 1 })
      if (result.data[0] === undefined) {
        result.data[0] = { orderId: id }
      }
      res.json(result)
    }, () => {
      res.status(400).json({ error: 'Wrong Param' })
    })
  }
}
