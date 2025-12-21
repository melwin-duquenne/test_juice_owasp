/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/**
 * Secure in-memory database implementation replacing marsdb
 * marsdb has a critical Command Injection vulnerability (GHSA-5mrr-rgp6-x4gr)
 * This implementation provides the same API without the security risks
 */

import { type Review } from './types'

export interface Order {
  _id?: string
  orderId: string
  totalPrice: number
  products: any[]
  bonus: number
  eta: string
  delivered?: boolean
  email?: string
}

interface BaseDocument {
  _id?: string
  [key: string]: any
}

class SecureCollection<T extends BaseDocument = BaseDocument> {
  private readonly name: string
  private readonly documents = new Map<string, T>()
  private idCounter: number = 1

  constructor (name: string) {
    this.name = name
  }

  private generateId (): string {
    return `${this.name}_${Date.now()}_${this.idCounter++}`
  }

  private matchesQuery (doc: T, query: Record<string, any>): boolean {
    for (const key of Object.keys(query)) {
      if (key === '$set' || key === '$push' || key === '$pull') continue

      const queryValue = query[key]
      const docValue = (doc as any)[key]

      if (typeof queryValue === 'object' && queryValue !== null) {
        // Handle MongoDB-like operators
        if ('$regex' in queryValue) {
          const regex = new RegExp(queryValue.$regex, queryValue.$options || '')
          if (!regex.test(String(docValue))) return false
        } else if ('$in' in queryValue) {
          if (!queryValue.$in.includes(docValue)) return false
        } else if ('$ne' in queryValue) {
          if (docValue === queryValue.$ne) return false
        } else if ('$gt' in queryValue) {
          if (!(docValue > queryValue.$gt)) return false
        } else if ('$lt' in queryValue) {
          if (!(docValue < queryValue.$lt)) return false
        } else if ('$gte' in queryValue) {
          if (!(docValue >= queryValue.$gte)) return false
        } else if ('$lte' in queryValue) {
          if (!(docValue <= queryValue.$lte)) return false
        } else {
          // Nested object comparison
          if (JSON.stringify(docValue) !== JSON.stringify(queryValue)) return false
        }
      } else {
        if (docValue !== queryValue) return false
      }
    }
    return true
  }

  async find (query: Record<string, any> = {}): Promise<T[]> {
    const results: T[] = []
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        results.push({ ...doc })
      }
    }
    return results
  }

  async findOne (query: Record<string, any> = {}): Promise<T | null> {
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        return { ...doc }
      }
    }
    return null
  }

  async insert (doc: T | T[]): Promise<T | T[]> {
    if (Array.isArray(doc)) {
      return await Promise.all(doc.map(async d => await this.insertOne(d)))
    }
    return await this.insertOne(doc)
  }

  async insertOne (doc: T): Promise<T> {
    const newDoc = { ...doc }
    if (!newDoc._id) {
      newDoc._id = this.generateId()
    }
    this.documents.set(newDoc._id, newDoc)
    return { ...newDoc }
  }

  async update (query: Record<string, any>, update: Record<string, any>, options?: { multi?: boolean }): Promise<{ modified: number, original?: T[] }> {
    let modified = 0
    const original: T[] = []
    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesQuery(doc, query)) {
        original.push({ ...doc })
        const updatedDoc = { ...doc }

        if (update.$set) {
          Object.assign(updatedDoc, update.$set)
        } else if (update.$push) {
          for (const [key, value] of Object.entries(update.$push)) {
            if (!Array.isArray((updatedDoc as any)[key])) {
              (updatedDoc as any)[key] = []
            }
            (updatedDoc as any)[key].push(value)
          }
        } else if (update.$pull) {
          for (const [key, value] of Object.entries(update.$pull)) {
            if (Array.isArray((updatedDoc as any)[key])) {
              (updatedDoc as any)[key] = (updatedDoc as any)[key].filter((item: any) => item !== value)
            }
          }
        } else {
          // Direct update (replace fields)
          Object.assign(updatedDoc, update)
        }

        this.documents.set(id, updatedDoc)
        modified++

        if (!options?.multi) break
      }
    }
    return { modified, original }
  }

  async count (query: Record<string, any> = {}): Promise<number> {
    let count = 0
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        count++
      }
    }
    return count
  }

  async remove (query: Record<string, any>): Promise<{ removed: number }> {
    let removed = 0
    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesQuery(doc, query)) {
        this.documents.delete(id)
        removed++
      }
    }
    return { removed }
  }
}

export const reviewsCollection = new SecureCollection<Review>('reviews')
export const ordersCollection = new SecureCollection<Order>('orders')
