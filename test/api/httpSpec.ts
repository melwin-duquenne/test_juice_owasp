/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby'
import config from 'config'

const URL = 'http://localhost:3000'

describe('HTTP', () => {
  it('response must contain CORS header allowing specific origin', () => {
    return frisby.get(URL)
      .expect('status', 200)
      .expect('header', 'Access-Control-Allow-Origin', 'http://localhost:3000')
  })

  it('response must contain deny frameguard header for clickjacking protection', () => {
    return frisby.get(URL)
      .expect('status', 200)
      .expect('header', 'X-Frame-Options', 'DENY')
  })

  it('response must contain nosniff header', () => {
    return frisby.get(URL)
      .expect('status', 200)
      .expect('header', 'X-Content-Type-Options', 'nosniff')
  })

  it('response must not contain recruiting header', () => {
    return frisby.get(URL)
      .expect('status', 200)
      .expect('header', 'X-Recruiting', config.get('application.securityTxt.hiring'))
  })

  it('response must contain XSS protection header disabled by Helmet for security', () => {
    // Helmet disables X-XSS-Protection (sets to 0) as the XSS Auditor
    // in legacy browsers can introduce security vulnerabilities
    return frisby.get(URL)
      .expect('status', 200)
      .expect('header', 'X-XSS-Protection', '0')
  })
})
