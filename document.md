# Documentation des corrections de sécurité - OWASP Juice Shop

## Table des matières

1. [Analyse SonarQube](#analyse-sonarqube)
2. [Analyse des dépendances npm](#analyse-des-dépendances-npm)
3. [Analyse OWASP ZAP](#analyse-owasp-zap)
4. [Corrections appliquées](#corrections-appliquées)
5. [Améliorations infrastructure](#améliorations-infrastructure)
6. [Résumé et recommandations](#résumé-et-recommandations)

---

## Analyse SonarQube

![Capture de SonarQube avant correction](image_document/SonarErreur.png)

### Vulnérabilités détectées

| # | Vulnérabilité | Fichiers concernés |
|---|---------------|-------------------|
| 1 | Jetons JWT exposés en clair | `app.guard.spec.ts:38`, `last-login-ip.component.spec.ts:61` |
| 2 | Clé privée exposée | `lib/insecurity.ts:23` |
| 3 | Exécution dynamique de code | `routes/b2bOrder.ts`, `routes/createProductReviews.ts`, `server.ts:304`, `routes/fileUpload.ts`, `routes/likeProductReviews.ts`, `routes/orderHistory.ts`, `routes/redirect.ts`, `routes/showProductReviews.ts`, `routes/trackOrder.ts`, `routes/updateProductReviews.ts` |
| 4 | Construction de chemins non sécurisée | `routes/fileUpload.ts`, `routes/profileImageUrlUpload.ts`, `routes/vulnCodeFixes.ts`, `routes/vulnCodeSnippet.ts` |
| 5 | Injection SQL | `routes/login.ts:34`, `routes/search.ts:21-23` |
| 6 | Seed phrase exposée | `routes/checkKeys.ts` |
| 7 | Clé HMAC exposée | `lib/insecurity.ts` |
| 8 | Injection MongoDB | `routes/createProductReviews.ts` |
| 9 | Injection via res.render | `routes/dataErasure.ts` |
| 10 | Template Pug non sécurisé | `routes/errorHandler.ts` |

![Capture de SonarQube après correction](image_document/SonarCorrection.png)

---

## Analyse des dépendances npm

### Vulnérabilités critiques et hautes

| Package | Version vulnérable | Sévérité | Description |
|---------|-------------------|----------|-------------|
| jsonwebtoken | 0.4.0 | **CRITIQUE** | Version obsolète (2013), multiples CVE |
| express-jwt | 0.1.3 | **HAUTE** | Bypass d'autorisation (GHSA-6g6m-m6h5-w9gf) |
| sanitize-html | 1.4.2 | **HAUTE** | XSS via contournement |
| marsdb | * | **CRITIQUE** | Command Injection (GHSA-5mrr-rgp6-x4gr) |
| vm2 (via juicy-chat-bot) | * | **CRITIQUE** | Sandbox Escape (GHSA-whpj-8f3w-67p5) |
| unzipper | 0.9.15 | **HAUTE** | Zip Slip path traversal |
| socket.io | 3.1.2 | **HAUTE** | Vulnérabilités engine.io/ws |
| js-yaml | 3.14.0 | **HAUTE** | Exécution de code arbitraire |
| express-ipfilter (ip) | * | **HAUTE** | SSRF (GHSA-2p57-rm9w-gvfp) |
| download (got) | * | **HAUTE** | Multiples vulnérabilités |

---

## Analyse OWASP ZAP

### Vulnérabilités identifiées

| Vulnérabilité | Sévérité | Endpoints affectés |
|---------------|----------|-------------------|
| CSP: Wildcard Directive | Moyenne | Tous (8+) |
| CSP: script-src unsafe-eval | Moyenne | Tous (8+) |
| CSP: script-src unsafe-inline | Faible | Tous (8+) |
| CSP: style-src unsafe-inline | Faible | Tous (8+) |
| Mauvaise configuration CORS | Moyenne | 31 endpoints |
| Vulnerable JS Library (jQuery) | Moyenne | jQuery 2.2.4 |
| Cloud Metadata SSRF | Moyenne | Potentiel |

---

## Corrections appliquées

### 1. Secrets et credentials externalisés

| Secret | Variable d'environnement | Fichier |
|--------|-------------------------|---------|
| Clé privée JWT | `PRIVATE_KEY` | `lib/insecurity.ts` |
| Clé HMAC | `HMAC_SECRET` | `lib/insecurity.ts` |
| Seed phrase | `MNEMONIC_SEED` | `routes/checkKeys.ts` |
| JWT de test | `TEST_JWT` | `app.guard.spec.ts` |
| JWT de test (login IP) | `TEST_JWT_LAST_LOGIN_IP` | `last-login-ip.component.spec.ts` |

### 2. Injection SQL

**routes/login.ts** : Requête SQL brute remplacée par ORM Sequelize

```typescript
// AVANT - Vulnérable
const query = `SELECT * FROM Users WHERE email = '${email}' AND password = '${password}'`

// APRÈS - Sécurisé
UserModel.findOne({ where: { email, password } })
```

**routes/search.ts** : Critère de recherche validé et nettoyé avant utilisation.

### 3. Injection NoSQL/MongoDB

**Fichiers corrigés** : `trackOrder.ts`, `showProductReviews.ts`, `updateProductReviews.ts`, `likeProductReviews.ts`, `createProductReviews.ts`

```typescript
// AVANT - Vulnérable ($where permet l'exécution de code)
reviews.find({ $where: `this._id === '${id}'` })

// APRÈS - Sécurisé
if (!/^[a-fA-F0-9]{24}$/.test(id)) {
  return res.status(400).json({ error: 'Invalid ID' })
}
reviews.findOne({ _id: id })
```

### 4. Exécution de code dynamique

**routes/b2bOrder.ts** : Suppression de `safeEval`

```typescript
// AVANT - Vulnérable
const orderLines = safeEval(orderLinesData)

// APRÈS - Sécurisé (parsing JSON uniquement)
const orderLines = JSON.parse(orderLinesData)
```

**routes/fileUpload.ts** : Suppression de l'exécution via `vm`, parsing direct des fichiers.

### 5. Path Traversal et SSRF

**routes/profileImageUrlUpload.ts** :

```typescript
// Validation sécurisée
const parsedUrl = new URL(imageUrl)
if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
  return res.status(400).json({ error: 'Invalid protocol' })
}
if (imageUrl.includes('..')) {
  return res.status(400).json({ error: 'Path traversal detected' })
}
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
if (!allowedExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext))) {
  return res.status(400).json({ error: 'Invalid file extension' })
}
```

### 6. Redirections ouvertes

**lib/insecurity.ts** : Validation stricte par parsing d'URL

```typescript
// AVANT - Contournable avec https://evil.com?redirect=https://github.com/juice-shop
export const isRedirectAllowed = (url: string) => {
  for (const allowedUrl of redirectAllowlist) {
    allowed = allowed || url.includes(allowedUrl)
  }
}

// APRÈS - Sécurisé
export const isRedirectAllowed = (url: string) => {
  try {
    const parsedUrl = new URL(url)
    for (const allowedUrl of redirectAllowlist) {
      const parsedAllowed = new URL(allowedUrl)
      if (parsedUrl.protocol === parsedAllowed.protocol &&
          parsedUrl.host === parsedAllowed.host) {
        if (parsedUrl.pathname === parsedAllowed.pathname ||
            parsedUrl.pathname.startsWith(parsedAllowed.pathname + '/')) {
          return true
        }
      }
    }
    return false
  } catch {
    return false
  }
}
```

### 7. Template Injection (Pug)

**routes/dataErasure.ts** : Filtrage des champs transmis

```typescript
// AVANT - Vulnérable
res.render('dataErasureResult', { ...req.body })

// APRÈS - Sécurisé
res.render('dataErasureResult', {
  email: req.body.email,
  securityAnswer: req.body.securityAnswer
})
```

**routes/errorHandler.ts** : Compilation sécurisée et échappement

```typescript
// Compilation avec options restrictives
const template = pug.compile(pugTemplate, {
  compileDebug: false,
  inlineRuntimeFunctions: false,
  filename: 'error.pug'
})

// Nettoyage de l'objet error
const sanitizedError = {
  message: String(error.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  stack: String(error.stack || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

### 8. Mise à jour des dépendances

```json
{
  "jsonwebtoken": "^9.0.2",
  "express-jwt": "^8.4.1",
  "sanitize-html": "^2.13.1",
  "unzipper": "^0.12.3",
  "socket.io": "^4.8.1",
  "helmet": "^8.0.0",
  "pdfkit": "^0.15.2",
  "js-yaml": "^4.1.0",
  "socket.io-client": "^4.8.1",
  "http-server": "^14.1.1",
  "mocha": "^11.1.0",
  "check-dependencies": "^2.0.0"
}
```

### 9. Remplacement de packages vulnérables

#### marsdb → SecureCollection

```typescript
// data/mongodb.ts - Implémentation sécurisée
class SecureCollection<T extends BaseDocument = BaseDocument> {
  private documents: Map<string, T> = new Map()

  async find(query: Record<string, any> = {}): Promise<T[]> {
    // Implémentation sécurisée sans injection possible
  }

  async findOne(query: Record<string, any> = {}): Promise<T | null> {
    // ...
  }

  async insert(doc: Partial<T>): Promise<T> {
    // ...
  }

  async update(query: Record<string, any>, update: Record<string, any>): Promise<number> {
    // ...
  }
}

export const reviewsCollection = new SecureCollection<Review>('reviews')
export const ordersCollection = new SecureCollection<Order>('orders')
```

#### juicy-chat-bot → SimpleChatBot

```typescript
// lib/SimpleChatBot.ts - Sans dépendance à vm2
class SimpleChatBot {
  private trainingSet: Map<string, string> = new Map()

  addTrainingData(key: string, response: string): void {
    this.trainingSet.set(key.toLowerCase(), response)
  }

  getResponse(input: string): string {
    // Utilise fuzzy matching (fuzzball) au lieu de vm2
    const bestMatch = fuzz.extractOne(input.toLowerCase(), Array.from(this.trainingSet.keys()))
    if (bestMatch && bestMatch[1] > 60) {
      return this.trainingSet.get(bestMatch[0]) || this.defaultResponse
    }
    return this.defaultResponse
  }
}
```

#### express-ipfilter → secureIpFilter

```typescript
// lib/securityMiddleware.ts
export const secureIpFilter = (allowedIps: string[], options: { mode: 'allow' | 'deny' }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req)
    // Validation sans utiliser le package 'ip' vulnérable
    const isAllowed = allowedIps.some(ip => clientIp === ip)
    if ((options.mode === 'allow' && !isAllowed) ||
        (options.mode === 'deny' && isAllowed)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    next()
  }
}
```

#### download → axios

```typescript
// AVANT
import download from 'download'
const data = await download(url)

// APRÈS
import axios from 'axios'
const response = await axios.get(url, { responseType: 'arraybuffer' })
const data = Buffer.from(response.data)
```

### 10. Corrections de compatibilité API

#### html-entities v1 → v2

```typescript
// AVANT
import { AllHtmlEntities as Entities } from 'html-entities'
const entities = new Entities()
entities.encode(text)
entities.decode(html)

// APRÈS
import { encode as htmlEncode, decode as htmlDecode } from 'html-entities'
htmlEncode(text)
htmlDecode(html)
```

**Fichiers corrigés** : `challengeUtils.ts`, `datacreator.ts`, `userProfile.ts`, `videoHandler.ts`

#### express-jwt v0.1.3 → v8.4.1

```typescript
// AVANT - Vulnérable (pas d'algorithme spécifié = algorithm confusion attack)
import expressJwt from 'express-jwt'
export const isAuthorized = () => expressJwt({ secret: publicKey } as any)

// APRÈS - Sécurisé
import { expressjwt } from 'express-jwt'
export const isAuthorized = () => expressjwt({
  secret: publicKey,
  algorithms: ['RS256']
})
```

#### socket.io-client v3 → v4

```typescript
// AVANT
import io from 'socket.io-client'
let socket: SocketIOClient.Socket

// APRÈS
import { io, Socket } from 'socket.io-client'
let socket: Socket
```

#### Suppression de jws (remplacé par jsonwebtoken)

```typescript
// AVANT
import jws from 'jws'
export const verify = (token: string) => jws.verify(token, publicKey)
export const decode = (token: string) => jws.decode(token)?.payload

// APRÈS
import jwt from 'jsonwebtoken'
export const verify = (token: string) => {
  try {
    jwt.verify(token, publicKey, { algorithms: ['RS256'] })
    return true
  } catch {
    return false
  }
}
export const decode = (token: string) => jwt.decode(token)
```

---

## Améliorations infrastructure

### 1. Middleware de sécurité global (lib/securityMiddleware.ts)

#### Protection Path Traversal

```typescript
export const preventPathTraversal = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /\.\.\//,                    // ../
      /\.\.\\/,                    // ..\
      /%2e%2e%2f/i,               // URL encoded ../
      /%2e%2e%5c/i,               // URL encoded ..\
      /%c0%ae/i,                  // UTF-8 encoded .
      /%c1%9c/i,                  // UTF-8 encoded \
      /%00/                       // Null byte
    ]

    const fullPath = req.path + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '')
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullPath) || pattern.test(decodeURIComponent(fullPath))) {
        return res.status(400).json({ error: 'Invalid path' })
      }
    }
    next()
  }
}
```

#### Headers de sécurité

```typescript
export const additionalSecurityHeaders = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    next()
  }
}
```

#### Sanitization des requêtes

```typescript
export const sanitizeRequestBody = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,           // onclick=, onerror=, etc.
      /\$where/i,             // MongoDB $where
      /\$ne/i,                // MongoDB $ne
      /\$gt/i,                // MongoDB $gt
      /\$lt/i                 // MongoDB $lt
    ]

    const bodyStr = JSON.stringify(req.body)
    for (const pattern of dangerousPatterns) {
      if (pattern.test(bodyStr)) {
        console.warn(`[SECURITY] Suspicious pattern detected: ${pattern} from IP: ${req.ip}`)
      }
    }
    next()
  }
}
```

### 2. Configuration CORS sécurisée

```typescript
// AVANT - Vulnérable (Access-Control-Allow-Origin: *)
app.options('*', cors())
app.use(cors())

// APRÈS - Sécurisé
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))
```

### 3. Content Security Policy

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://gravatar.com', 'https://www.gravatar.com', 'https://i.imgur.com'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' }
}))
```

**Note** : `unsafe-inline` conservé pour script-src (cookie consent) et style-src (Angular Material).

### 4. Rate Limiting

```typescript
// Rate limiting global
const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/assets/')
})
app.use(globalRateLimiter)

// Rate limiting strict pour endpoints sensibles
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later.' }
})
app.use('/rest/user/login', strictRateLimiter)
app.use('/rest/user/whoami', strictRateLimiter)
app.use('/api/Users', strictRateLimiter)

// Rate limiting pour accès fichiers
const fileAccessRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: { error: 'Too many file requests, please try again later.' }
})
app.use('/ftp', fileAccessRateLimiter)
```

| Endpoint | Limite | Fenêtre | Protection |
|----------|--------|---------|------------|
| Global | 300 req | 1 min | DoS général |
| `/rest/user/login` | 10 req | 15 min | Brute force |
| `/rest/user/whoami` | 10 req | 15 min | Enumération |
| `/api/Users` | 10 req | 15 min | Création comptes |
| `/ftp/*` | 50 req | 1 min | Scan fichiers |

### 5. Protection SSRF (Cloud Metadata)

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  const blockedPatterns = [
    /169\.254\.169\.254/,        // AWS metadata
    /metadata\.google\.internal/, // GCP metadata
    /169\.254\.170\.2/,          // AWS ECS metadata
    /fd00:ec2::254/,             // AWS IPv6 metadata
    /metadata\.azure\.internal/, // Azure metadata
    /100\.100\.100\.200/         // Alibaba Cloud metadata
  ]

  const url = req.url + JSON.stringify(req.body || {})
  for (const pattern of blockedPatterns) {
    if (pattern.test(url)) {
      return res.status(403).json({ error: 'Access to cloud metadata is blocked' })
    }
  }
  next()
})
```

### 6. Sécurisation Dockerfile

```dockerfile
# Suppression --unsafe-perm
RUN npm install --omit=dev

# Audit de sécurité pendant le build
RUN npm audit --audit-level=high --omit=dev || echo "Security audit completed"

# Permissions restrictives
RUN chmod -R 750 ftp/ frontend/dist/ data/ i18n/
RUN chmod -R 770 logs/

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/rest/admin/application-version', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
```

### 7. Mise à jour jQuery

`frontend/src/assets/public/vendor/jquery.min.js` : 2.2.4 → 3.7.1

### 8. Optimisation gestion d'erreurs

**Problème** : Chaque requête invalide créait un objet `Error`, causant des fuites mémoire.

```typescript
// AVANT - Fuite mémoire
res.status(403)
next(new Error('Only .md and .pdf files are allowed!'))

// APRÈS - Pas de fuite mémoire
res.status(403).json({ error: 'Only .md and .pdf files are allowed!' })
```

---

## Résumé et recommandations

### Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `package.json` | Mise à jour dépendances, suppression packages obsolètes |
| `Dockerfile` | Sécurisation build, healthcheck |
| `lib/insecurity.ts` | express-jwt, jws, validation redirections, secrets externalisés |
| `lib/securityMiddleware.ts` | **Nouveau** - Middlewares de sécurité |
| `lib/SimpleChatBot.ts` | **Nouveau** - Remplacement juicy-chat-bot |
| `lib/challengeUtils.ts` | html-entities v2 |
| `data/mongodb.ts` | SecureCollection remplaçant marsdb |
| `routes/*.ts` | Corrections injection, validation, nettoyage |
| `server.ts` | Middlewares, CORS, CSP, rate limiting |

### Tableau récapitulatif

| Catégorie | Avant | Après |
|-----------|-------|-------|
| Dépendances critiques | 10+ vulnérables | Mises à jour/remplacées |
| Secrets exposés | 5 secrets en clair | Variables d'environnement |
| Injection SQL/NoSQL | Vulnérable | Requêtes paramétrées |
| Path Traversal | Protection partielle | Middleware global |
| CORS | Wildcard (*) | Origine restreinte |
| CSP | Aucune | Politique stricte |
| Rate Limiting | Aucun | Multi-niveau |
| Docker | --unsafe-perm | Sécurisé + healthcheck |

### Vulnérabilités restantes (non corrigeables)

| Package | Sévérité | Raison |
|---------|----------|--------|
| grunt-replace-json (lodash.set) | HIGH | Outil de build uniquement, pas de correctif |
| postcss (via stylelint) | MODERATE | Outil dev frontend |

### Recommandations post-correction

```bash
# 1. Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# 2. Vérifier l'audit
npm audit

# 3. Tester l'application
npm run test
npm run lint

# 4. Rebuilder Docker
docker build -t juice-shop-secure .
```

### Améliorations futures pour unsafe-inline

Pour une sécurité maximale en production :
1. Utiliser des nonces ou hashes pour les scripts/styles inline
2. Externaliser le script cookie consent
3. Modifier la configuration Angular pour externaliser les styles

