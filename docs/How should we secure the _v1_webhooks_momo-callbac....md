Securing a webhook in fintech is critical. If a hacker discovers your /v1/webhooks/momo-callback URL, they can send a fake HTTP POST request claiming they just deposited 10,000 GHS. If your backend blindly trusts it, it will release the escrow funds, and the platform takes the financial loss.  
To prevent this, payment providers (like Paystack, Flutterwave, or Hubtel) sign their webhook payloads using an **HMAC (Hash-based Message Authentication Code)**.  
Here is how to structure your backend to cryptographically verify these incoming deposits, alongside the Node.js/TypeScript code to execute it safely.

### **1\. The Three Pillars of Webhook Security**

A simple HMAC verification is not enough. A production-grade fintech webhook must defend against three specific attack vectors:

1. **Spoofing (The HMAC Signature):** The payment provider hashes the JSON body using a shared secret key (which only you and the provider know) and sends the hash in a header (e.g., x-momo-signature). You recalculate the hash on your server. If they match, the payload is authentic.  
2. **Replay Attacks (Timestamp Validation):** A hacker intercepts a *legitimate* webhook request and resends it 20 minutes later to try and trigger a double-deposit. Your backend must check the timestamp header and reject any request older than 5 minutes.  
3. **Timing Attacks (Constant-Time Comparison):** If you use a standard string comparison (===) to check the hashes, a hacker can measure the milliseconds it takes your server to reject the request and theoretically guess the secret key character by character. You must use a "constant-time" comparison function.

### **2\. Node.js / Express Implementation**

Here is the exact Express middleware you would use to secure the endpoint.  
**Crucial Pitfall:** You **must** compute the HMAC using the raw, unparsed buffer of the request body. If Express parses the JSON first (e.g., via express.json()), it might remove a single whitespace or newline, completely changing the resulting hash and causing legitimate payments to fail.  
`import express, { Request, Response, NextFunction } from 'express';`  
`import crypto from 'crypto';`

`const app = express();`

`// 1. We must grab the raw body before Express parses it into JSON`  
`app.use(express.json({`  
  `verify: (req: any, res, buf) => {`  
    `req.rawBody = buf;`  
  `}`  
`}));`

`// The secret key provided by your Mobile Money gateway dashboard (Store in .env!)`  
`const MOMO_SECRET_KEY = process.env.MOMO_WEBHOOK_SECRET || 'super_secret_key';`

`export function verifyMoMoWebhook(req: Request, res: Response, next: NextFunction) {`  
  `const signatureHeader = req.headers['x-momo-signature'] as string;`  
  `const timestampHeader = req.headers['x-momo-timestamp'] as string;`

  `if (!signatureHeader || !timestampHeader) {`  
    `return res.status(401).json({ error: 'Missing security headers' });`  
  `}`

  `// 2. Prevent Replay Attacks`  
  `// Check if the webhook is older than 5 minutes (300 seconds)`  
  `const webhookTime = parseInt(timestampHeader, 10);`  
  `const currentTime = Math.floor(Date.now() / 1000);`  
  `if (Math.abs(currentTime - webhookTime) > 300) {`  
    `return res.status(401).json({ error: 'Webhook timestamp expired (Replay attack)' });`  
  `}`

  `// 3. Compute the HMAC using the raw buffer, not the parsed JSON`  
  `const rawBody = (req as any).rawBody;`  
    
  `// Combine the timestamp and the body to prevent replay manipulation`  
  ``const stringToSign = `${timestampHeader}.${rawBody.toString('utf8')}`;``

  `const computedHash = crypto`  
    `.createHmac('sha256', MOMO_SECRET_KEY)`  
    `.update(stringToSign)`  
    `.digest('hex');`

  `// 4. Prevent Timing Attacks using timingSafeEqual`  
  `const expectedBuffer = Buffer.from(signatureHeader, 'hex');`  
  `const computedBuffer = Buffer.from(computedHash, 'hex');`

  `// Ensure buffers are the same length before comparing to avoid thrown errors`  
  `if (expectedBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, computedBuffer)) {`  
    `console.error('CRITICAL: Webhook signature mismatch. Possible spoofing attempt.');`  
    `return res.status(401).json({ error: 'Invalid signature' });`  
  `}`

  `// Security checks passed! Move to the actual route handler`  
  `next();`  
`}`

`// 5. The Route Handler`  
`app.post('/v1/webhooks/momo-callback', verifyMoMoWebhook, async (req, res) => {`  
  `// Acknowledge receipt IMMEDIATELY.`   
  `// If you take longer than 3-5 seconds to respond, the provider will assume`   
  `// you died and will keep retrying, causing duplicate processing.`  
  `res.status(200).send('OK');`

  `const payload = req.body;`  
  `const transactionId = payload.data.transaction_id;`  
  `const status = payload.data.status;`

  `// Process the webhook asynchronously after responding`  
  `processPaymentAsync(transactionId, status);`  
`});`

`async function processPaymentAsync(transactionId: string, status: string) {`  
  `// 1. Check your database to see if transactionId is already processed (Idempotency check)`  
  `// 2. If valid, update the transaction_ledger to 'FUNDS_DEPOSITED'`  
  `// 3. Trigger push notification to the vendor`  
`}`

### **3\. The "Fast Response" Rule**

Notice how res.status(200).send('OK'); is called *before* processPaymentAsync().  
Mobile Money gateways demand speed. If you try to write to your PostgreSQL database, run your AI triage logic, and wait for third-party APIs *before* returning a 200 OK, the connection will time out. The gateway will assume your server is down and will aggressively retry sending the same webhook every few minutes, potentially causing you to fund the escrow account twice.  
Always verify the math, say "Got it\!", and do the heavy database lifting in the background.