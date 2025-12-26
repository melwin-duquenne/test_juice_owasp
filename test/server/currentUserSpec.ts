/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import sinon from 'sinon'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { retrieveLoggedInUser } from '../../routes/currentUser'
import { authenticatedUsers } from '../../lib/insecurity'
import type { UserModel } from 'models/user'
const expect = chai.expect
chai.use(sinonChai)

describe('currentUser', () => {
  let req: any
  let res: any

  beforeEach(() => {
    req = { cookies: {}, query: {} }
    res = { json: sinon.spy() }
  })

  it('should return neither ID nor email if no cookie was present in the request headers', () => {
    req.cookies.token = ''

    retrieveLoggedInUser()(req, res)

    expect(res.json).to.have.been.calledWith({ user: { id: undefined, email: undefined, lastLoginIp: undefined, profileImage: undefined } })
  })

  it('should return ID and email of user belonging to cookie from the request', () => {
    req.cookies.token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxLCJlbWFpbCI6ImFkbWluQGp1aWNlLXNoLm9wIiwibGFzdExvZ2luSXAiOiIwLjAuMC4wIiwicHJvZmlsZUltYWdlIjoiZGVmYXVsdC5zdmcifSwiaWF0IjoxNTgyMjIyMzY0fQ.mO4-XCEU4ObZGv8_nhbAehlvvSeI2vzTnVC46Y2ZDszGzLiM30ClmxyvgPzwVTTLvGJU0nzIl1qimgIkYKAQhilmwbVILb-ooJvtjeZo1Ka2WwFT8mVlIkWZqDiHyS_9Q5ryl7r1LY4UpQdRp_9UMjWkSI54SKtcgcF-cEM0U5Sx1jmXxNfdyQir4spWw31IZz0HgJ1UyZG3bBnqoFwukmfc6jJM6GW6kDbpngefBY6Opm7Q_cUmBhUP0sKyvpmAIrZAaRHpTaZFFa_xbvPYHxkaeed9p6Occ7qk-vCa0MsV-4Pu6xKz2uKerI8LjKP1oqbBV3RrEPGsugKu5-6ocQ'
    req.query.callback = undefined
    authenticatedUsers.put(
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxLCJlbWFpbCI6ImFkbWluQGp1aWNlLXNoLm9wIiwibGFzdExvZ2luSXAiOiIwLjAuMC4wIiwicHJvZmlsZUltYWdlIjoiZGVmYXVsdC5zdmcifSwiaWF0IjoxNTgyMjIyMzY0fQ.mO4-XCEU4ObZGv8_nhbAehlvvSeI2vzTnVC46Y2ZDszGzLiM30ClmxyvgPzwVTTLvGJU0nzIl1qimgIkYKAQhilmwbVILb-ooJvtjeZo1Ka2WwFT8mVlIkWZqDiHyS_9Q5ryl7r1LY4UpQdRp_9UMjWkSI54SKtcgcF-cEM0U5Sx1jmXxNfdyQir4spWw31IZz0HgJ1UyZG3bBnqoFwukmfc6jJM6GW6kDbpngefBY6Opm7Q_cUmBhUP0sKyvpmAIrZAaRHpTaZFFa_xbvPYHxkaeed9p6Occ7qk-vCa0MsV-4Pu6xKz2uKerI8LjKP1oqbBV3RrEPGsugKu5-6ocQ',
      { data: { id: 1, email: 'admin@juice-sh.op', lastLoginIp: '0.0.0.0', profileImage: '/assets/public/images/uploads/default.svg' } as unknown as UserModel }
    )
    retrieveLoggedInUser()(req, res)

    expect(res.json).to.have.been.calledWith({ user: { id: 1, email: 'admin@juice-sh.op', lastLoginIp: '0.0.0.0', profileImage: '/assets/public/images/uploads/default.svg' } })
  })
})
