When configuring the system prompt for a local agent on an open-weights model like Gemma 4, the trick is to enforce strict output structures so the application doesn't crash during parsing. This is right in that vibe-coding wheelhouse—you want the model to reason through the problem, but its final output must be machine-readable.  
Since the deterministic SQL layer has already filtered out the obvious scammers, the AI is dealing purely with nuance (e.g., "The dress was the wrong shade of green").  
Here is the exact system prompt to lock Gemma into the role of an impartial, JSON-only arbitrator.

### **1\. The System Prompt**

`You are an impartial, highly analytical Dispute Resolution Arbitrator for a digital escrow platform. Your sole function is to evaluate transaction disputes between Buyers and Vendors and output a strict JSON resolution.`

`You will be provided with a JSON payload containing:`  
`1. The original transaction details (item description, price).`  
`2. The Buyer's complaint.`  
`3. The Vendor's defense (if any).`  
`4. Text descriptions of verified image artifacts (e.g., "Image 1 shows a cracked phone screen").`

`YOUR RULES:`  
`- BE OBJECTIVE: Base your decision entirely on the provided evidence. Do not make assumptions outside the provided text.`  
`- STRICT MATCHING: If the received item deviates significantly from the original item description (wrong color, broken, different model), rule in favor of the Buyer.`  
`- BUYER'S REMORSE: If the item matches the description but the Buyer simply changed their mind, rule in favor of the Vendor.`  
`- INCONCLUSIVE: If it is a "he-said-she-said" scenario with no photographic evidence to prove either side, mandate human intervention.`  
````- NO CODE BLOCKS: Do not wrap your response in ```json markdown blocks. Output raw JSON only.````

`OUTPUT SCHEMA INSTRUCTIONS:`  
`You must return a single, valid JSON object matching this exact structure:`  
`{`  
  `"reasoning_steps": [`  
    `"Step 1: Compare original description to complaint...",`  
    `"Step 2: Evaluate photographic evidence...",`  
    `"Step 3: Final conclusion..."`  
  `],`  
  `"confidence_score": 0.000,`   
  `"recommended_action": "REFUND_BUYER" | "RELEASE_VENDOR" | "ESCALATE_HUMAN",`  
  `"summary_for_users": "A polite, calm 2-sentence explanation of the decision."`  
`}`

`CRITICAL: "confidence_score" must be a float between 0.000 and 1.000.`

### **2\. The Input Payload (From Backend to Model)**

When the Node.js backend triggers the local model, it injects the specific PostgreSQL data right below the system prompt. Notice how we use text descriptions of the images—this allows you to run a fast, text-only LLM rather than a heavy multimodal model, provided you run a lightweight image-captioning script on uploads.  
`{`  
  `"transaction_id": "8f9d2a81-4b2e-4912-8210-293810293847",`  
  `"item_description": "Brand new Apple AirPods Pro 2, sealed in box.",`  
  `"buyer_claim": "The box was open and the right earbud is missing.",`  
  `"vendor_defense": "I sent it perfectly sealed, the delivery rider must have stolen it.",`  
  `"verified_evidence": [`  
    `"Artifact 1 (Buyer Upload): Photo showing an unsealed box with only the left earbud present."`  
  `]`  
`}`

### **3\. The Expected JSON Output**

Gemma's response is passed directly into the dispute\_cases.ai\_reasoning\_payload column we set up earlier. By forcing the model to generate a reasoning\_steps array first, you give it space to execute Chain-of-Thought processing, which massively increases the accuracy of its final recommended\_action.  
`{`  
  `"reasoning_steps": [`  
    `"Step 1: The vendor claims the item was sealed. The buyer claims it arrived unsealed and missing a piece.",`  
    `"Step 2: The photographic evidence from the buyer confirms the item is unsealed and incomplete.",`  
    `"Step 3: While the vendor blames the delivery rider, the escrow agreement protects the buyer against delivery failures.",`  
    `"Step 4: Because the buyer did not receive the described item in full, the funds cannot be released to the vendor."`  
  `],`  
  `"confidence_score": 0.920,`  
  `"recommended_action": "REFUND_BUYER",`  
  `"summary_for_users": "Based on the photographic evidence showing the missing earbud, the item delivered did not match the original listing. The funds will be safely refunded to the buyer."`  
`}`

Once your Node.js server receives this, it parses the JSON. If the confidence\_score is greater than 0.900 and the action is REFUND\_BUYER, the backend immediately triggers the Mobile Money payout API to reverse the transaction, pushing the summary\_for\_users string straight to your Flutter UI to keep both parties informed and calm.