import { ObjectId } from 'mongodb'
/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import { ordersCollection } from '../data/mongodb'
import * as security from '../lib/insecurity'

export function orderHistory () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.get(req.headers?.authorization?.replace('Bearer ', ''))
    if (loggedInUser?.data?.email && loggedInUser.data.id) {
      // Sanitation de l’email et validation de l’id
      const email = typeof loggedInUser.data.email === 'string' ? loggedInUser.data.email.replace(/["'\\<>]/g, '') : ''
      const userId = typeof loggedInUser.data.id === 'number' ? loggedInUser.data.id.toString().replace(/[^a-zA-Z0-9]/g, '') : ''
      if (!email || !userId) {
        next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
        return
      }
      const updatedEmail = email.replace(/[aeiou]/gi, '*')
      const order = await ordersCollection.find({ email: updatedEmail })
      res.status(200).json({ status: 'success', data: order })
    } else {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
    }
  }
}

export function allOrders () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const order = await ordersCollection.find()
    res.status(200).json({ status: 'success', data: order.reverse() })
  }
}

export function toggleDeliveryStatus () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const deliveryStatus = !req.body.deliveryStatus
    const eta = deliveryStatus ? '0' : '1'
    let objectId: ObjectId | null = null
    if (typeof req.params.id === 'string' && ObjectId.isValid(req.params.id)) {
      objectId = new ObjectId(req.params.id)
    }
    if (!objectId) {
      return res.status(400).json({ error: 'Invalid order id' })
    }
    await ordersCollection.update({ _id: objectId }, { $set: { delivered: deliveryStatus, eta } })
    res.status(200).json({ status: 'success' })
  }
}
