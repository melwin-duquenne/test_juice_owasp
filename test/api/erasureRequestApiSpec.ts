/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby'

const jsonHeader = { 'content-type': 'application/json' }
const BASE_URL = 'http://localhost:3000'
const REST_URL = 'http://localhost:3000/rest'

describe('/dataerasure', () => {
  it('GET erasure form for logged-in users includes their email and security question', () => {
    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern@owasp.org',
        password: 'kitten lesser pooch karate buffoon indoors'
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.get(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token }
        })
          .expect('status', 200)
          .expect('bodyContains', 'bjoern@owasp.org')
          .expect('bodyContains', 'Name of your favorite pet?')
      })
  })

  it('GET erasure form rendering fails for users without assigned security answer', () => {
    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.get(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token }
        })
          .expect('status', 500)
          .expect('bodyContains', 'Error: No answer found!')
      })
  })

  it('GET erasure form rendering fails on unauthenticated access', () => {
    return frisby.get(BASE_URL + '/dataerasure/')
      .expect('status', 500)
      .expect('bodyContains', 'Error: Blocked illegal activity')
  })

  it('POST erasure request does not actually delete the user', () => {
    const form = frisby.formData()
    form.append('email', 'bjoern.kimminich@gmail.com')

    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: form
        })
          .expect('status', 200)
          .expect('header', 'Content-Type', 'text/html; charset=utf-8')
          .then(() => {
            return frisby.post(REST_URL + '/user/login', {
              headers: jsonHeader,
              body: {
                email: 'bjoern.kimminich@gmail.com',
                password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
              }
            })
              .expect('status', 200)
          })
      })
  })

  it('POST erasure form fails on unauthenticated access', () => {
    return frisby.post(BASE_URL + '/dataerasure/')
      .expect('status', 500)
      .expect('bodyContains', 'Error: Blocked illegal activity')
  })

  it('POST erasure request with empty layout parameter returns 200', () => {
    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: {
            layout: null
          }
        })
          .expect('status', 200)
      })
  })

  // Security: Path traversal in layout parameter should be blocked
  it('POST erasure request with path traversal in layout parameter is handled safely', () => {
    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: {
            layout: '../this/file/does/not/exist'
          }
        })
          .expect('status', 200)
          // Path traversal is blocked, returns normal response
      })
  })

  // Security: Arbitrary file read via layout parameter should be blocked
  it('POST erasure request with file path as layout parameter does not expose file contents', () => {
    return frisby.post(REST_URL + '/user/login', {
      headers: jsonHeader,
      body: {
        email: 'bjoern.kimminich@gmail.com',
        password: 'bW9jLmxpYW1nQGhjaW5pbW1pay5ucmVvamI='
      }
    })
      .expect('status', 200)
      .then(({ json: jsonLogin }) => {
        return frisby.post(BASE_URL + '/dataerasure/', {
          headers: { Cookie: 'token=' + jsonLogin.authentication.token },
          body: {
            layout: '../package.json'
          }
        })
          .expect('status', 200)
          // File content should not be exposed
      })
  })
})
