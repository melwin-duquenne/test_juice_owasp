/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
import * as frisby from 'frisby'

import { challenges } from '../../data/datacache'
import * as utils from '../../lib/utils'
import * as security from '../../lib/insecurity'
const Joi = frisby.Joi

const API_URL = 'http://localhost:3000/b2b/v2/orders'

const tokenRaw = security.authorize()
const token = typeof tokenRaw === 'string' ? tokenRaw : ''
const authHeader = { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }

describe('/b2b/v2/orders', () => {
  // Security: Malicious code execution attempts should be blocked
  if (utils.isChallengeEnabled(challenges.rceChallenge) || utils.isChallengeEnabled(challenges.rceOccupyChallenge)) {
    it('POST endless loop exploit in "orderLinesData" is blocked', () => {
      return frisby.post(API_URL, {
        headers: authHeader,
        body: {
          orderLinesData: '(function dos() { while(true); })()'
        }
      })
        .expect('status', 400)
    })

    it('POST regex DoS attack in "orderLinesData" is blocked', () => {
      return frisby.post(API_URL, {
        headers: authHeader,
        body: {
          orderLinesData: '/((a+)+)b/.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaa")'
        }
      })
        .expect('status', 400)
    })

    it('POST sandbox breakout attack in "orderLinesData" is blocked', () => {
      return frisby.post(API_URL, {
        headers: authHeader,
        body: {
          orderLinesData: 'this.constructor.constructor("return process")().exit()'
        }
      })
        .expect('status', 400)
    })
  }

  it('POST new B2B order is forbidden without authorization token', () => {
    return frisby.post(API_URL, {})
      .expect('status', 401)
  })

  it('POST new B2B order with valid orderLinesData', () => {
    return frisby.post(API_URL, {
      headers: authHeader,
      body: {
        orderLinesData: '[{"productId": 1, "quantity": 1}]'
      }
    })
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .expect('jsonTypes', {
        cid: Joi.string(),
        orderNo: Joi.string(),
        paymentDue: Joi.string()
      })
  })

  it('POST new B2B order with cid returns the cid', () => {
    return frisby.post(API_URL, {
      headers: authHeader,
      body: {
        cid: 'test-cid',
        orderLinesData: '[{"productId": 1, "quantity": 1}]'
      }
    })
      .expect('status', 200)
      .expect('json', {
        cid: 'test-cid'
      })
  })
})
