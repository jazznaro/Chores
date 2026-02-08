
# Free & Scalable Architecture Strategies

Since Google Sheets has rate limits and concurrency issues, here are three architectural strategies to scale the Family Chores app while keeping infrastructure costs at zero (or near zero) for personal use.

## 1. The "Serverless" Approach (Firebase / Firestore)
**Best for:** Easy transition, low maintenance, standard web development patterns.

*   **How it works:** Replace `googleSheetsService.ts` with the Firebase SDK. The database is a NoSQL document store.
*   **The "Free" Factor:** The Firebase "Spark Plan" offers generous daily limits (50k reads, 20k writes) that a single family will never exceed.
*   **Pros:**
    *   **Real-time:** Updates happen instantly via WebSockets.
    *   **Offline Support:** SDK handles caching and re-syncing automatically.
    *   **Auth:** Free, built-in authentication.
*   **Cons:** Vendor lock-in (harder to migrate than SQL).

## 2. The "Local-First" Approach (CRDTs + TinyBase)
**Best for:** Speed, offline-first reliability, poor network conditions.

*   **How it works:** The primary database lives in the user's browser (IndexedDB). A "dumb" relay server passes messages between devices to merge changes using CRDTs (Conflict-free Replicated Data Types). Libraries like **TinyBase** or **Yjs** handle the math.
*   **The "Free" Factor:**
    *   **PartyKit** or **Glitch**: Can host the lightweight WebSocket relay server on free tiers.
*   **Pros:**
    *   **Zero Latency:** UI interactions are instant because they don't wait for the network.
    *   **Conflict Resolution:** Mathematically handles two parents updating the same chore at the same time.
*   **Cons:** Higher initial complexity to set up the sync engine.

## 3. The "Edge SQL" Approach (Cloudflare D1)
**Best for:** SQL lovers, relational data models, high performance.

*   **How it works:** Write a backend API using **Cloudflare Workers** (edge functions) and store data in **D1** (Serverless SQLite).
*   **The "Free" Factor:**
    *   **Workers:** 100,000 requests/day free.
    *   **D1:** 5GB storage and millions of ops/month free.
*   **Pros:**
    *   **SQL Power:** Use standard SQL queries (`SELECT * FROM chores...`).
    *   **Speed:** Code runs physically close to the user on the Edge.
*   **Cons:** Requires writing and maintaining a manual API layer (unlike Firebase's plug-and-play SDK).
