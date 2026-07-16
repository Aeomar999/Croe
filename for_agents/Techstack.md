# Social Commerce Escrow Platform — Technical Stack & Dependencies (Techstack.md)

## 1. Stack Overview & Selection Rationale
The Social Escrow platform is built for **emerging markets fintech**, where network connectivity is frequently unstable (high latency 3G/4G cellular drops), mobile devices span diverse hardware specifications, and regulatory compliance demands immutable auditability.

```
+-----------------------------------------------------------------------------------+
|                              CLIENT TIER (Cross-Platform)                         |
|  Flutter (Dart 3.x) | Riverpod / BLoC | Dio HTTP Client + Forensic Interceptor    |
+-----------------------------------------------------------------------------------+
                                        |  HTTPS (REST / JSON) + X-Forensic Headers
                                        v
+-----------------------------------------------------------------------------------+
|                              API & MIDDLEWARE TIER                                |
|  Node.js 20 LTS (TypeScript) | Express / Fastify | Raw Buffer HMAC Verifier       |
+-----------------------------------------------------------------------------------+
                  |                                              |
      (Async Webhooks & Cache)                      (Row-Level ACID Locks)
                  v                                              v
+------------------------------------+    +-----------------------------------------+
|     REDIS IN-MEMORY CACHE          |    |     POSTGRESQL 16+ RELATIONAL DB        |
| - SETNX Idempotency Locks          |    | - UUIDv4, NUMERIC(15,2), INET, JSONB    |
| - Rate Limiting & Webhook Cache    |    | - Partial Unique Indexes & Append-Only  |
+------------------------------------+    +-----------------------------------------+
                                                                 |
                                                    (Forensic Context Payload)
                                                                 v
                                          +-----------------------------------------+
                                          |    LOCAL AI TRIAGE & ARBITRATOR         |
                                          | - Open-Weights LLM (Gemma 4 / Llama 3)  |
                                          | - Local Inference Engine (vLLM/Ollama)  |
                                          +-----------------------------------------+
```

---

## 2. Frontend Technology Stack (Mobile Client)

### 2.1 Core Framework & Language
- **Framework**: **Flutter 3.22+**
  - **Rationale**: Single codebase providing native 60fps performance on both iOS and Android. Ensures pixel-perfect geometric UI consistency crucial for establishing trust in fintech applications.
- **Language**: **Dart 3.4+** (Sound Null Safety enforced)

### 2.2 Key Client Libraries & Dependencies (`pubspec.yaml`)
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Networking & Middleware
  dio: ^5.4.3                # Core HTTP client supporting custom middleware & interceptors
  
  # Hardware & Network Forensics
  device_info_plus: ^10.1.0  # Silent device hardware ID capture
  connectivity_plus: ^6.0.3  # Network state capture (WIFI, CELLULAR_4G, CELLULAR_5G)
  package_info_plus: ^8.0.0  # Dynamic app version & build number extraction
  
  # State Management
  flutter_riverpod: ^2.5.1   # Reactive, compile-safe state management for contract lifecycle
  
  # Cryptography & Utilities
  uuid: ^4.4.0               # Client-side Idempotency-Key generation (UUIDv4)
  crypto: ^3.0.3             # Client-side file hashing utilities
```

---

## 3. Backend Technology Stack (API Server)

### 3.1 Runtime & Framework
- **Runtime**: **Node.js 20.x LTS**
- **Language**: **TypeScript 5.4+** (Strict mode enabled: `noImplicitAny: true`, `strictNullChecks: true`)
- **API Framework**: **Express 4.19+ / Fastify 4.x** configured with raw buffer capture for cryptographic webhook validation.

### 3.2 Key Node.js Packages (`package.json`)
```json
{
  "dependencies": {
    "pg": "^8.11.5",                  // PostgreSQL connection pool client
    "redis": "^4.6.13",               // Redis client for distributed idempotency locks
    "uuid": "^9.0.1",                 // UUID generation and parsing
    "dotenv": "^16.4.5",              // Environment variable configuration
    "helmet": "^7.1.0",               // Security headers
    "express": "^4.19.2",             // API routing
    "axios": "^1.6.8"                 // External MoMo gateway requests
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "@types/pg": "^8.11.5",
    "@types/express": "^4.17.21",
    "typescript": "^5.4.5"
  }
}
```

---

## 4. Database & Caching Layer

### 4.1 Primary Relational Database
- **Engine**: **PostgreSQL 16+**
- **Connection Pooling**: **pgBouncer** configured in transaction pooling mode (or `pg.Pool` with `max: 20`, `idleTimeoutMillis: 30000`).
- **Core Database Features Utilized**:
  - `UUID-OSSP` extension for non-enumerable primary keys.
  - Native `NUMERIC(15,2)` for exact currency arithmetic (preventing IEEE 754 float drift).
  - Native `INET` type for high-speed IPv4/IPv6 indexing and Sybil velocity queries.
  - Native `JSONB` with `GIN` indexing for structured LLM reasoning payloads.
  - **Partial Unique Indexes** to enforce single-deposit constraints at the database engine level.

### 4.2 Distributed Cache & Idempotency Store
- **Engine**: **Redis 7.2+**
- **Use Cases**:
  - `SETNX` idempotency locking for incoming Mobile Money webhooks (24-hour TTL).
  - Rate limiting API endpoints per IP/Device fingerprint.
  - Caching read-heavy contract status lookups (`GET /v1/escrow/:id`).

---

## 5. Local AI Triage Engine

### 5.1 Model Selection & Infrastructure
- **Base Model**: **Gemma 4** (or equivalent open-weights financial triage fine-tune, e.g., `gemma-4-local-fintech-v1`).
- **Deployment Strategy**: **Self-Hosted Local Inference** (vLLM / Ollama / Python FastAPI Container).
  - **Rationale**: Eliminates third-party data leakage (GDPR / local data privacy compliance), ensures zero external API cost per dispute, and protects against prompt injection by running behind our deterministic SQL heuristic firewall.
- **Output Format Constraints**: Strict JSON Schema generation only; markdown code blocks disabled via system instructions.

---

## 6. Payments Infrastructure & Third-Party Integrations

### 6.1 Mobile Money (MoMo) Aggregators
- **Supported Gateways**: Paystack, Flutterwave, Hubtel, or direct Telco carrier integrations (MTN MoMo API, Telecel Cash, AirtelTigo Money).
- **Protocol**: Asynchronous USSD push prompts for deposits (`POST /v1/escrow/:id/deposit`) followed by signed HMAC-SHA256 callback webhooks (`POST /v1/webhooks/momo-callback`).
- **Payout Rails**: Instant B2C (Business-to-Consumer) wallet disbursements via mobile money APIs upon delivery confirmation.
