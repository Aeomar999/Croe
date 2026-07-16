This is the classic "Double Spend" or race condition problem in fintech. If two identical webhooks hit your server simultaneously, both might query the database, see that the transaction is still awaiting payment, and both proceed to trigger the payout logic.  
To solve this, you cannot rely entirely on your Node.js application layer. You must push the concurrency control down to the PostgreSQL database layer using a combination of **Row-Level Locking** and **Atomic Database Constraints**.  
Here is how to make the database bulletproof against simultaneous webhooks.

### **1\. Pessimistic Locking (SELECT FOR UPDATE)**

When the webhook hits your server, your database transaction must actively "lock" the parent contract row before reading its status. This forces simultaneous requests to line up in a queue rather than process in parallel.  
When you open your SQL transaction block, use the FOR UPDATE clause:  
`BEGIN;`

`-- 1. Lock the parent transaction row exclusively.`  
`-- If Thread B tries to run this exact query at the same millisecond,`   
`-- PostgreSQL will pause Thread B here until Thread A finishes.`  
`SELECT current_status`   
`FROM escrow_transactions`   
`WHERE transaction_id = '8f9d2a81...'`   
`FOR UPDATE;`

`-- 2. Your Node.js code checks the status.`  
`-- If status is ALREADY 'FUNDS_DEPOSITED', you immediately ROLLBACK and return 200 OK.`

`-- 3. If it's safe, insert the ledger event.`  
`INSERT INTO transaction_ledger (transaction_id, event_type, new_status)`  
`VALUES ('8f9d2a81...', 'FUNDS_DEPOSITED', 'FUNDS_SECURED');`

`-- 4. Update the parent status`  
`UPDATE escrow_transactions`   
`SET current_status = 'FUNDS_SECURED'`   
`WHERE transaction_id = '8f9d2a81...';`

`COMMIT;`

**How it protects you:** Thread A and Thread B arrive at millisecond 0\. Thread A gets the lock. Thread B is physically blocked by PostgreSQL from reading the row. Thread A processes the deposit and commits. Thread B is unblocked, reads the row, sees current\_status \= 'FUNDS\_SECURED', realizes it's a duplicate, and safely aborts.

### **2\. The Ultimate Shield: Partial Unique Indexes**

Application code has bugs. Developers might accidentally write a query outside of a BEGIN/COMMIT block, bypassing your locks. You need a structural database constraint that physically makes double-funding impossible.  
You can enforce this by adding a **Partial Unique Index** to your transaction\_ledger table.  
`-- This index guarantees that a specific transaction can ONLY have`   
`-- ONE 'FUNDS_DEPOSITED' event in its entire lifecycle.`  
`CREATE UNIQUE INDEX idx_single_deposit_per_transaction`   
`ON transaction_ledger(transaction_id)`   
`WHERE event_type = 'FUNDS_DEPOSITED';`

**How it protects you:** If two threads completely bypass your application locks and try to INSERT the deposit event at the exact same time, PostgreSQL will allow the first one to write to disk. The second thread will hit a fatal duplicate key value violates unique constraint error and crash the transaction. Crashing is vastly cheaper than paying out 10,000 GHS twice.

### **3\. Idempotency Key Caching**

To handle the network retries cleanly without throwing database errors every time, your API gateway or a fast in-memory store like Redis should intercept duplicate requests before they even reach PostgreSQL.

* When the webhook arrives, hash the raw body to create an idempotency key.  
* Attempt to SETNX (Set if Not eXists) this key in Redis with a 24-hour expiration.  
* If SETNX returns 0 (meaning the key already exists), your server knows this is a retry of a webhook it has already acknowledged. It simply returns 200 OK and stops processing immediately.