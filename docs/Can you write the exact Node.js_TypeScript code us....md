To safely execute a row-level lock using node-postgres (pg), you must perform all operations on the **exact same client instance** from your connection pool.  
If you accidentally call pool.query() for separate steps, pg will assign each query to a random connection from the pool, completely breaking the atomic isolation of the SQL BEGIN, SELECT FOR UPDATE, and COMMIT block.  
Here is the production-ready Node.js/TypeScript code using a dedicated client connection wrapper to handle your concurrent webhook inputs safely.

### **1\. Robust Node.js/TypeScript Transaction Implementation**

`import { Pool, PoolClient } from 'pg';`

`// Initialize your connection pool (configure this based on your database resource limits)`  
`const pool = new Pool({`  
  `connectionString: process.env.DATABASE_URL,`  
  `max: 20, // Max concurrent connections allowed in the pool`  
  `idleTimeoutMillis: 30000,`  
`});`

`interface WebhookResult {`  
  `success: boolean;`  
  `message: string;`  
`}`

`export async function processDepositWebhook(`  
  `transactionId: string,`   
  `actorId: string | null`  
`): Promise<WebhookResult> {`  
  `// 1. Checkout a dedicated client connection from the pool`  
  `const client: PoolClient = await pool.connect();`

  `try {`  
    `// 2. Open the atomic database transaction block`  
    `await client.query('BEGIN');`

    `// 3. Lock the target row exclusively.`   
    `// This blocks any incoming parallel threads trying to look at this transaction ID.`  
    `` const lockQuery = ` ``  
      `SELECT current_status`   
      `FROM escrow_transactions`   
      `WHERE transaction_id = $1`   
      `FOR UPDATE;`  
    `` `; ``  
    `const lockResult = await client.query(lockQuery, [transactionId]);`

    `if (lockResult.rows.length === 0) {`  
      `// Release the transaction safely; no row exists to modify`  
      `await client.query('ROLLBACK');`  
      `return { success: false, message: 'Transaction record not found.' };`  
    `}`

    `const currentStatus = lockResult.rows[0].current_status;`

    `// 4. Check if the deposit has already been processed by a parallel thread`  
    `if (currentStatus === 'FUNDS_SECURED') {`  
      `// The race condition was won by another request. De-escalate cleanly.`  
      `await client.query('ROLLBACK');`  
      `return { success: true, message: 'Deposit already processed by a concurrent thread. Skipping safely.' };`  
    `}`

    `// 5. Insert the cryptographic append-only event into the transaction ledger`  
    `` const ledgerQuery = ` ``  
      `INSERT INTO transaction_ledger (`  
        `transaction_id,`   
        `actor_id,`   
        `event_type,`   
        `previous_status,`   
        `new_status`  
      `) VALUES ($1, $2, 'FUNDS_DEPOSITED', $3, 'FUNDS_SECURED');`  
    `` `; ``  
    `await client.query(ledgerQuery, [transactionId, actorId, currentStatus]);`

    `// 6. Push the updated state into the parent tracking record`  
    `` const updateQuery = ` ``  
      `UPDATE escrow_transactions`   
      `SET current_status = 'FUNDS_SECURED',`  
          `updated_at = NOW()`  
      `WHERE transaction_id = $1;`  
    `` `; ``  
    `await client.query(updateQuery, [transactionId]);`

    `// 7. Everything passed cleanly. Commit changes to disk permanently.`  
    `await client.query('COMMIT');`  
    `return { success: true, message: 'Escrow funds secured successfully.' };`

  `} catch (error: any) {`  
    `// 8. If ANY step fails (or hits our Partial Unique Index constraint), undo everything.`  
    `await client.query('ROLLBACK');`  
    ``console.error(`CRITICAL: Transaction rolled back for ID ${transactionId}. Reason:`, error.message);``  
      
    `// Check for PostgreSQL Unique Violation error code (23505)`  
    `if (error.code === '23505') {`  
      `return { success: true, message: 'Unique index constraint caught duplicate deposit event. Defended.' };`  
    `}`  
      
    `throw error; // Bubble up unexpected environment or infrastructure system faults`  
  `} finally {`  
    `// 9. IMPORTANT: Always return the client connection back to the pool,`   
    `// otherwise your application will eventually run out of connections and hang!`  
    `client.release();`  
  `}`  
`}`

### **2\. Operational Considerations**

* **Handling the Unique Constraint (Error 23505):** Notice how we catch error.code \=== '23505'. If your concurrency locks fail for any external architectural reason, our partial unique index (idx\_single\_deposit\_per\_transaction) catches the duplicate INSERT and throws this specific database violation error. We log it and safely tell the calling webhook "Success" so it stops retrying.  
* **The Power of finally:** If your database server crashes, or your Node.js app runs out of memory inside the try block, the finally wrapper guarantees that client.release() is fired. This protects the fintech app from connection leaks.