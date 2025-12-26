/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/**
 * Secure ChatBot implementation replacing juicy-chat-bot
 * This implementation does NOT use vm2 which has critical sandbox escape vulnerabilities
 * It provides the same API as juicy-chat-bot for compatibility
 */

import fuzz from 'fuzzball'

interface TrainingIntent {
  intent: string
  utterances: string[]
  answers: Array<{
    action: 'response' | 'function'
    body?: string
    handler?: string
  }>
}

interface TrainingData {
  lang: string
  data: TrainingIntent[]
}

interface ChatResponse {
  action: 'response' | 'function' | 'namequery'
  body?: string
  handler?: string
}

interface UserInfo {
  id: string
  username: string
}

/**
 * SimpleChatBot - A secure chatbot without vm2 dependency
 * Uses fuzzy string matching for intent detection
 */
class SimpleChatBot {
  private readonly name: string
  private readonly greeting: string
  private readonly defaultResponse: string
  private readonly intents: TrainingIntent[] = []
  private readonly users = new Map<string, UserInfo>()

  public training = {
    state: false
  }

  // Factory object for compatibility with juicy-chat-bot API
  public factory = {
    run: (code: string): string | boolean => {
      // Parse currentUser('userId') calls securely without eval
      const match = code.match(/^currentUser\(['"]([^'"]+)['"]\)$/)
      if (match) {
        const userId = match[1]
        const user = this.users.get(userId)
        return user ? user.username : false
      }
      return false
    }
  }

  constructor (name: string, greeting: string, trainingDataJson: string, defaultResponse: string) {
    this.name = name
    this.greeting = greeting
    this.defaultResponse = defaultResponse

    try {
      const trainingData: TrainingData = JSON.parse(trainingDataJson)
      this.intents = trainingData.data || []
    } catch (err) {
      console.error('Failed to parse training data:', err)
      this.intents = []
    }
  }

  /**
   * Train the chatbot (processes intents for faster matching)
   */
  async train (): Promise<void> {
    // Pre-process utterances for faster matching
    this.intents.forEach(intent => {
      intent.utterances = intent.utterances.map(u => u.toLowerCase().trim())
    })
    this.training.state = true
    await Promise.resolve()
  }

  /**
   * Add or update a user
   */
  addUser (userId: string, username: string): void {
    // Sanitize inputs to prevent injection
    const safeUserId = String(userId).replace(/[<>'"\\]/g, '')
    const safeUsername = String(username).replace(/[<>'"\\]/g, '')

    this.users.set(safeUserId, {
      id: safeUserId,
      username: safeUsername
    })
  }

  /**
   * Get greeting message for a user
   */
  greet (userId: string): string {
    const user = this.users.get(userId)
    const username = user?.username ?? 'customer'
    return this.greeting.replace(/<customer-name>/g, username)
  }

  /**
   * Find the best matching intent for a query
   */
  private findIntent (query: string): { intent: TrainingIntent | null, score: number } {
    const normalizedQuery = query.toLowerCase().trim()
    let bestMatch: TrainingIntent | null = null
    let bestScore = 0

    for (const intent of this.intents) {
      for (const utterance of intent.utterances) {
        // Use fuzzy matching to find similar utterances
        const score = fuzz.ratio(normalizedQuery, utterance)

        // Also check for partial matches (for longer queries)
        const partialScore = fuzz.partial_ratio(normalizedQuery, utterance)
        const tokenScore = fuzz.token_sort_ratio(normalizedQuery, utterance)

        // Take the best of the three matching methods
        const maxScore = Math.max(score, partialScore, tokenScore)

        if (maxScore > bestScore) {
          bestScore = maxScore
          bestMatch = intent
        }
      }
    }

    return { intent: bestMatch, score: bestScore }
  }

  /**
   * Process a query and return a response
   */
  async respond (query: string, userId: string): Promise<ChatResponse> {
    const user = this.users.get(userId)

    // Find matching intent
    const { intent, score } = this.findIntent(query)

    // Threshold for accepting a match (60% similarity)
    const MATCH_THRESHOLD = 60

    if (intent && score >= MATCH_THRESHOLD && intent.answers.length > 0) {
      // Select a random answer from available answers
      const answerIndex = Math.floor(Math.random() * intent.answers.length)
      const answer = intent.answers[answerIndex]

      if (answer.action === 'function' && answer.handler) {
        return {
          action: 'function',
          handler: answer.handler
        }
      } else if (answer.body) {
        // Replace placeholders in response
        let body = answer.body
        if (user) {
          body = body.replace(/<customer-name>/g, user.username)
        }
        return {
          action: 'response',
          body
        }
      }
    }

    // No match found, return default response
    return {
      action: 'response',
      body: this.defaultResponse
    }
  }
}

export default SimpleChatBot
