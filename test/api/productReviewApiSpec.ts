/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type IncomingMessage } from 'node:http'
import * as frisby from 'frisby'
import http from 'node:http'

import * as security from '../../lib/insecurity'
const Joi = frisby.Joi

const REST_URL = 'http://localhost:3000/rest'

const jsonHeader = { 'content-type': 'application/json' }
const tokenRaw = security.authorize()
const token = typeof tokenRaw === 'string' ? tokenRaw : ''
const authHeader = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }

describe('/rest/products/:id/reviews', () => {
  const reviewResponseSchema = {
    id: Joi.number(),
    product: Joi.number(),
    message: Joi.string(),
    author: Joi.string()
  }

  it('GET product reviews by product id', () => {
    return frisby.get(`${REST_URL}/products/1/reviews`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('jsonTypes', reviewResponseSchema)
  })

  // Security: MongoDB injection attempts should be blocked
  it('GET product reviews with invalid product id is blocked', () => {
    return frisby.get(`${REST_URL}/products/sleep(1)/reviews`)
      .expect('status', 400)
  })

  it('PUT single product review can be created', () => {
    return frisby.put(`${REST_URL}/products/1/reviews`, {
      body: {
        message: 'Lorem Ipsum',
        author: 'Anonymous'
      }
    })
      .expect('status', 201)
      .expect('header', 'content-type', /application\/json/)
  })
})

describe('/rest/products/reviews', () => {
  const updatedReviewResponseSchema = {
    modified: Joi.number(),
    original: Joi.array(),
    updated: Joi.array()
  }

  let reviewId: string

  beforeAll((done) => {
    http.get(`${REST_URL}/products/1/reviews`, (res: IncomingMessage) => {
      let body = ''

      res.on('data', (chunk: string) => {
        body += chunk
      })

      res.on('end', () => {
        const response = JSON.parse(body)
        reviewId = response.data[0]._id
        done()
      })
    })
  })

  it('PATCH single product review can be edited with valid id', () => {
    return frisby.patch(`${REST_URL}/products/reviews`, {
      headers: authHeader,
      body: {
        id: reviewId,
        message: 'Lorem Ipsum Updated'
      }
    })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('jsonTypes', updatedReviewResponseSchema)
  })

  it('PATCH single product review editing needs an authenticated user', () => {
    return frisby.patch(`${REST_URL}/products/reviews`, {
      body: {
        id: reviewId,
        message: 'Lorem Ipsum'
      }
    })
      .expect('status', 401)
  })

  it('POST non-existing product review returns 400 for invalid id', () => {
    return frisby.post(`${REST_URL}/user/login`, {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(`${REST_URL}/products/reviews`, {
          headers: { Authorization: `Bearer ${jsonLogin.authentication.token}` },
          body: {
            id: 'does not exist'
          }
        })
          .expect('status', 400)
      })
  })

  it('POST single product review can be liked with valid id', () => {
    return frisby.post(`${REST_URL}/user/login`, {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(`${REST_URL}/products/reviews`, {
          headers: { Authorization: `Bearer ${jsonLogin.authentication.token}` },
          body: {
            id: reviewId
          }
        })
          .expect('status', 200)
          .expect('jsonTypes', { likesCount: Joi.number() })
      })
  })

  // Security: NoSQL injection via $ne operator should be blocked
  it('PATCH with NoSQL injection operator is blocked', () => {
    return frisby.patch(`${REST_URL}/products/reviews`, {
      headers: authHeader,
      body: {
        id: { $ne: -1 },
        message: 'injection attempt'
      }
    })
      .expect('status', 400)
  })
})
