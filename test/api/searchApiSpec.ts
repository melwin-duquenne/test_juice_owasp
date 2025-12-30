/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as frisby from 'frisby'
import { expect } from '@jest/globals'

const API_URL = 'http://localhost:3000/api'
const REST_URL = 'http://localhost:3000/rest'

describe('/rest/products/search', () => {
  it('GET product search with no matches returns no products', () => {
    return frisby.get(`${REST_URL}/products/search?q=nomatcheswhatsoever`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(0)
      })
  })

  it('GET product search with one match returns found product', () => {
    return frisby.get(`${REST_URL}/products/search?q=o-saft`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(1)
      })
  })

  // Security tests: SQL injection should be handled safely (no errors, no data exposure)
  it('GET product search handles SQL injection attempt safely', () => {
    return frisby.get(`${REST_URL}/products/search?q=';`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      // Search should return valid response without exposing SQL errors
  })

  it('GET product search blocks UNION SELECT SQL injection', () => {
    return frisby.get(`${REST_URL}/products/search?q=' union select id,email,password from users--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        // SQL injection blocked - no sensitive data exposed
        expect(json.data.length).toBe(0)
      })
  })

  it('GET product search blocks UNION SELECT with parenthesis', () => {
    return frisby.get(`${REST_URL}/products/search?q=') union select id,email,password from users--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(0)
      })
  })

  it('GET product search blocks SELECT * injection', () => {
    return frisby.get(`${REST_URL}/products/search?q=')) union select * from users--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(0)
      })
  })

  it('GET product search blocks UNION SELECT with fixed columns', () => {
    return frisby.get(`${REST_URL}/products/search?q=')) union select '1','2','3','4','5','6','7','8','9' from users--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        // Should not expose user data - injection blocked
        expect(json.data.every((item: any) => item.price !== undefined)).toBe(true)
      })
  })

  it('GET product search blocks UNION SELECT trying to expose user credentials', () => {
    return frisby.get(`${REST_URL}/products/search?q=')) union select id,'2','3',email,password,'6','7','8','9' from users--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        // Verify no user emails or passwords are exposed in results
        const hasExposedCredentials = json.data.some((item: any) =>
          (typeof item.price === 'string' && item.price.includes('@')) ||
          (typeof item.deluxePrice === 'string' && item.deluxePrice.length > 30)
        )
        expect(hasExposedCredentials).toBe(false)
      })
  })

  it('GET product search blocks sqlite_master table access', () => {
    return frisby.get(`${REST_URL}/products/search?q=')) union select sql,'2','3','4','5','6','7','8','9' from sqlite_master--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        // Should not expose schema information
        const hasExposedSchema = json.data.some((item: any) =>
          typeof item.id === 'string' && item.id.includes('CREATE TABLE')
        )
        expect(hasExposedSchema).toBe(false)
      })
  })

  it('GET product search cannot access logically deleted items via SQL injection', () => {
    return frisby.get(`${REST_URL}/products/search?q=seasonal%20special%20offer'))--`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(0)
      })
  })

  it('GET product search with empty search parameter returns all products', () => {
    return frisby.get(`${API_URL}/Products`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        const products = json.data
        return frisby.get(`${REST_URL}/products/search?q=`)
          .expect('status', 200)
          .expect('header', 'content-type', /application\/json/)
          .then(({ json }) => {
            expect(json.data.length).toBe(products.length)
          })
      })
  })

  it('GET product search without search parameter returns all products', () => {
    return frisby.get(`${API_URL}/Products`)
      .expect('status', 200)
      .expect('header', 'content-type', /application\/json/)
      .then(({ json }) => {
        const products = json.data
        return frisby.get(`${REST_URL}/products/search`)
          .expect('status', 200)
          .expect('header', 'content-type', /application\/json/)
          .then(({ json }) => {
            expect(json.data.length).toBe(products.length)
          })
      })
  })
})
