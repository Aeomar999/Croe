For a mobile-first fintech application—especially one integrating with asynchronous Mobile Money (MoMo) networks over potentially unstable 3G/4G mobile data—we should structure the backend using a **Pragmatic REST architecture**.  
While GraphQL is great for flexible data querying, REST is superior here because fintech requires strict **idempotency**, explicit HTTP status codes for financial error handling, and direct compatibility with standard webhooks from payment providers.  
Here is the blueprint for how the Flutter front-end will communicate with our PostgreSQL database and the triage engine.

### **1\. The Core API Endpoints**

We will group the REST API into four distinct domains: **Escrow**, **Evidence**, **Disputes**, and **Webhooks**.

#### **A. Escrow & Contract Lifecycle (/v1/escrow)**

* POST /v1/escrow  
  * **Actor:** Vendor  
  * **Purpose:** Creates a new contract. Returns a shareable deep-link (e.g., https://app.escrow.co/pay/trx\_89201) to paste into WhatsApp or Instagram.  
* GET /v1/escrow/{transaction\_id}  
  * **Actor:** Buyer or Vendor  
  * **Purpose:** Fetches the current contract details, item description, and real-time status. Highly cached for fast loading when a buyer taps the chat link.  
* POST /v1/escrow/{transaction\_id}/deposit  
  * **Actor:** Buyer  
  * **Purpose:** Triggers the Mobile Money USSD prompt on the buyer's phone.  
  * **Payload:** { "phone\_number": "+233540000000", "provider": "MTN\_MOMO" }  
* POST /v1/escrow/{transaction\_id}/confirm-delivery  
  * **Actor:** Buyer  
  * **Purpose:** Buyer signals they received the item in good condition. Immediately triggers the backend to release escrow funds to the vendor's wallet.

#### **B. Evidence & Forensic Media (/v1/evidence)**

* POST /v1/evidence/upload  
  * **Actor:** Buyer or Vendor  
  * **Purpose:** Uploads photos of packaging, delivery receipts, or damaged items.  
  * **Backend Action:** The server receives the multipart form data, **computes the SHA-256 hash on the fly**, streams the file to secure cloud storage (like AWS S3 or Cloudflare R2), and writes the hash \+ device metadata directly to the evidence\_artifacts PostgreSQL table.

#### **C. The Dispute & Triage Engine (/v1/disputes)**

* POST /v1/disputes  
  * **Actor:** Buyer or Vendor  
  * **Purpose:** Initiates a dispute and triggers our **\< 1 Second Heuristic Security Check**.  
  * **Payload:**  
    {  
      "transaction\_id": "8f9d2a81-4b2e-4912-8210-293810293847",  
      "reason\_code": "ITEM\_DAMAGED",  
      "claim\_description": "The screen was cracked when I opened the box. See uploaded photo.",  
      "evidence\_artifact\_ids": \["c1a2b3c4-..."\]  
    }

  * **Immediate Response:** Returns 202 Accepted. The body returns the initial status based on the SQL heuristics (AI\_PROCESSING, RESOLVED\_AUTO, or UNDER\_HUMAN\_REVIEW).  
* GET /v1/disputes/{dispute\_id}/status  
  * **Actor:** Flutter App (via polling or WebSockets)  
  * **Purpose:** The app checks if the local Gemma AI model has finished evaluating the case and outputs the final resolution to the user.

#### **D. Asynchronous Webhooks (/v1/webhooks)**

* POST /v1/webhooks/momo-callback  
  * **Actor:** Mobile Money Provider (MTN, Telecel, AirtelTigo, etc.)  
  * **Purpose:** Since Mobile Money payments are asynchronous (the user takes 10–30 seconds to type their PIN on their phone), the payment gateway hits this webhook when the cash actually lands in the escrow account. The backend then inserts a FUNDS\_DEPOSITED event into transaction\_ledger and sends a push notification to the vendor to ship the goods.

### **2\. Critical Fintech Middleware (The "Secret Sauce")**

To make this architecture secure and reliable in Flutter, we must build two foundational middleware layers into the networking client (using a package like **Dio** in Flutter).

#### **1\. Automatic Forensic Header Injection**

To populate our PostgreSQL transaction\_ledger without relying on easily spoofed JSON request bodies, the Flutter app must use an HTTP interceptor to silently inject device forensics into the headers of **every single request**:  
POST /v1/disputes HTTP/1.1  
Host: api.escrow.co  
Authorization: Bearer eyJhbGciOi...  
X-Device-Fingerprint: a8f93j201928301k2j3  
X-Network-Type: CELLULAR\_4G  
X-App-Version: 1.0.4-build.22  
X-Client-Timestamp: 2026-07-13T15:09:00Z

When the backend API Gateway receives the request, it extracts these X- headers and binds them to the ip\_address, device\_id, and device\_metadata columns in PostgreSQL.

#### **2\. Strict Idempotency Keys (Idempotency-Key)**

In emerging markets, cellular connections drop frequently. Imagine a buyer taps **"Confirm Delivery"**, the request reaches our database and releases the vendor's money, but the cell tower drops the connection before the Flutter app receives the 200 OK success response.  
To prevent the user from tapping the button again and triggering a double-payout or double-dispute, Flutter must generate a unique UUIDv4 for every mutating request:  
Idempotency-Key: 7b9b80bf-3bd7-4417-9168-523284144183

If the backend sees an Idempotency-Key it has already processed in the last 24 hours, it simply returns the cached previous response without re-running the SQL transactions or charging wallets.