To execute the heuristic security check in under a second, the backend must rely on **"Fail-Fast" logic**. Before waking up the AI model and spending compute resources, we query the PostgreSQL database for hard cryptographic and behavioral anomalies.  
If any of these lightweight SQL queries trip a heuristic rule, the system bypasses the AI entirely, instantly freezing the funds and the offending accounts.  
Here are the exact SQL queries and the threshold rules that evaluate their results.

### **1\. The Zero-Tolerance Queries**

These queries are executed concurrently using connection pooling (e.g., via pgBouncer) the moment the user taps "Submit Dispute." Because we applied targeted indexes in the schema, each query will resolve in single-digit milliseconds.  
**Query A: The Cryptographic Hash Check (Catching Recycled Proof)** Scammers frequently recycle photos of damaged boxes or fake delivery receipts. This query checks if the exact file has ever been uploaded to a *different* transaction.  
`-- Parameters: $1 = Uploaded Image SHA-256 Hash, $2 = Current Transaction ID`  
`SELECT EXISTS (`  
    `SELECT 1`   
    `FROM evidence_artifacts`   
    `WHERE sha256_hash = $1`   
      `AND transaction_id != $2`  
`);`

**Query B: IP and Device Velocity (Catching Sybil Attacks)** A single user operating multiple fake accounts will often forget to spoof their hardware fingerprint or IP address. This query counts how many distinct accounts and disputes this specific device/IP has been involved with in the last 24 hours.  
`-- Parameters: $1 = Actor's IP Address, $2 = Actor's Device ID`  
`SELECT`   
    `COUNT(DISTINCT actor_id) AS distinct_accounts_used,`  
    `COUNT(DISTINCT transaction_id) AS disputes_initiated`  
`FROM transaction_ledger`  
`WHERE (ip_address = $1 OR device_id = $2)`  
  `AND event_type = 'DISPUTE_OPENED'`  
  `AND created_at >= NOW() - INTERVAL '24 hours';`

**Query C: Trust Profile & Account Age (Risk Assessment)** This pulls the user's base trust metrics to see if a brand-new, unverified account is attempting to dispute a high-value transaction.  
`-- Parameters: $1 = Actor User ID`  
`SELECT`   
    `trust_score,`  
    `is_frozen,`  
    `EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS account_age_hours`  
`FROM users`  
`WHERE user_id = $1;`

### **2\. The Heuristic Rule Engine (Backend Logic)**

Once the backend receives the results from the three SQL queries, it passes them through a strict, cascading logic gate.

1. **Rule 1: The Fraudulent Media Tripwire**  
   Condition: If Query A returns TRUE. Action: Critical Failure. The user is attempting to submit a recycled photo. The system instantly resolves the dispute against the uploader, drops their trust\_score by 50 points, and permanently flags the device ID. AI is bypassed.  
2. **Rule 2: The Sybil Velocity Tripwire**  
   Condition: If Query B returns distinct\_accounts\_used \> 2 OR disputes\_initiated \> 3\. Action: Critical Failure. A single device is burning through burner accounts to scam vendors. The system instantly updates is\_frozen \= TRUE for all accounts linked to that device ID and locks the funds. AI is bypassed.  
3. **Rule 3: The Burner Account Tripwire**  
   Condition: If Query C returns account\_age\_hours \< 48 AND trust\_score \< 50.00. Action: High Risk. A freshly made account with a poor standing is initiating a dispute. The system does not trust the AI to handle this edge case. It sets status to UNDER\_HUMAN\_REVIEW and routes it to an admin dashboard.  
4. **Rule 4: Clear to Proceed**  
   Condition: All SQL checks pass normally. Action: Success. The backend packages the transaction details, chat logs, and verified image URLs into a JSON payload and triggers the local Gemma AI model to evaluate the nuance of the dispute.

### **3\. Why this Architecture Wins**

By executing this deterministic layer first, you protect your local AI model from prompt injection and context manipulation. A scammer cannot trick the AI into refunding them with a clever sob story if the SQL layer already caught them uploading a previously hashed image of a "broken item."