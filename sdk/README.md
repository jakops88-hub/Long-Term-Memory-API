# @memvault/client

Official TypeScript/JavaScript SDK for [MemVault](https://memvault.io) - Long-Term Memory API with GraphRAG.

## 🚀 Installation

```bash
npm install @memvault/client
```

## 📖 Quick Start

```typescript
import { MemVault } from '@memvault/client';

// Initialize with your API key
const memvault = new MemVault(process.env.MEMVAULT_API_KEY);

// Add memories
await memvault.addMemory("Met with team about Q4 roadmap. Priority: mobile app redesign");
await memvault.addMemory("Sarah mentioned budget concerns for cloud infrastructure");

// Retrieve memories
const memories = await memvault.retrieve("What did we discuss about Q4?");
console.log(memories.results);

// Ask questions (AI-powered)
const answer = await memvault.ask("What are the budget concerns?");
console.log(answer.answer);
console.log("Sources:", answer.sources);
```

## 🔑 Authentication

Get your API key from the [MemVault Dashboard](https://memvault.io/dashboard) after completing checkout.

```typescript
const memvault = new MemVault('sk_your_api_key_here');
```

### Options

```typescript
const memvault = new MemVault(apiKey, {
  baseUrl: 'https://your-custom-domain.com',  // Optional: custom API endpoint
  timeout: 30000,                              // Optional: request timeout (ms)
  maxRetries: 3                                // Optional: retry attempts
});
```

## 📚 API Reference

### `addMemory(content, metadata?)`

Store a new memory in your knowledge graph. Processing happens asynchronously.

```typescript
const result = await memvault.addMemory(
  "Team decided to migrate to Kubernetes by end of Q2",
  { category: "infrastructure", priority: "high" }
);

console.log(result.jobId); // Track processing status
```

**Parameters:**
- `content` (string, required): Memory content
- `metadata` (object, optional): Additional structured data

**Returns:** `Promise<AddMemoryResponse>`

---

### `retrieve(query, options?)`

Search your knowledge graph for relevant memories.

```typescript
const results = await memvault.retrieve("kubernetes migration", {
  limit: 10,
  includeEntities: true,
  includeRelationships: true
});

console.log(results.results);      // Relevant memories
console.log(results.entities);     // Extracted entities (people, projects, etc.)
console.log(results.relationships); // Connections between entities
```

**Parameters:**
- `query` (string, required): Search query
- `options` (object, optional):
  - `limit` (number): Max results (default: 10)
  - `includeEntities` (boolean): Include entity graph (default: true)
  - `includeRelationships` (boolean): Include relationships (default: true)

**Returns:** `Promise<RetrieveResponse>`

---

### `ask(question)`

Ask a question and get an AI-generated answer based on your knowledge graph.

```typescript
const answer = await memvault.ask("When is the Kubernetes migration deadline?");

console.log(answer.answer);      // "The migration is scheduled for end of Q2"
console.log(answer.confidence);  // 0.95
console.log(answer.reasoning);   // Explanation of how answer was derived
console.log(answer.sources);     // Memories used to generate answer
```

**Parameters:**
- `question` (string, required): Your question

**Returns:** `Promise<AskResponse>`

---

### `getUser()`

Get current user information and billing status.

```typescript
const user = await memvault.getUser();

console.log(user.id);
console.log(user.tier);           // "PRO"
console.log(user.creditsBalance); // 1000.50
```

**Returns:** `Promise<User>`

---

### `listApiKeys()`

List all API keys for your account.

```typescript
const keys = await memvault.listApiKeys();

keys.forEach(key => {
  console.log(key.name, key.createdAt, key.lastUsed);
});
```

**Returns:** `Promise<ApiKey[]>`

---

### `deleteApiKey(keyId)`

Delete an API key (note: you cannot delete your last key).

```typescript
await memvault.deleteApiKey('key_abc123');
```

**Parameters:**
- `keyId` (string, required): ID of key to delete

**Returns:** `Promise<{ success: boolean }>`

---

## 🎯 Use Cases

### Personal Knowledge Base

```typescript
// Store information as you learn
await memvault.addMemory("React 19 introduces automatic batching for better performance");
await memvault.addMemory("Next.js 14 has improved image optimization with 40% faster loads");

// Retrieve when needed
const info = await memvault.ask("What did I learn about React 19?");
```

### Team Meeting Notes

```typescript
// After meetings, store key decisions
await memvault.addMemory(`
  Design Review - March 15, 2024
  Attendees: Sarah, Mike, Jessica
  Decision: Move forward with dark mode as default
  Action items: Sarah creates mockups, Mike updates design system
`);

// Later, anyone can query
const decisions = await memvault.retrieve("dark mode decision");
```

### Customer Support History

```typescript
// Store customer interactions
await memvault.addMemory(`
  Customer: Acme Corp
  Issue: API rate limiting causing 429 errors
  Solution: Upgraded to Enterprise tier
  Date: 2024-03-10
`);

// Quick lookup
const history = await memvault.ask("What issues has Acme Corp had?");
```

### Research & Documentation

```typescript
// Accumulate research findings
await memvault.addMemory("Study by MIT: GraphRAG improves retrieval accuracy by 60%");
await memvault.addMemory("Paper: 'Attention is All You Need' introduced transformers in 2017");

// Synthesize information
const summary = await memvault.ask("What are the key innovations in AI retrieval?");
```

---

## 🛡️ Error Handling

The SDK throws specific error types for different failure scenarios:

```typescript
import { 
  MemVault,
  AuthenticationError,
  RateLimitError,
  InsufficientCreditsError,
  ValidationError 
} from '@memvault/client';

try {
  await memvault.addMemory("Some content");
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.error("Too many requests, slow down");
  } else if (error instanceof InsufficientCreditsError) {
    console.error("Out of credits, please top up");
  } else if (error instanceof ValidationError) {
    console.error("Invalid input:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Error Types

- `AuthenticationError` (401): Invalid API key
- `InsufficientCreditsError` (402): Not enough credits
- `ValidationError` (400): Invalid input parameters
- `RateLimitError` (429): Too many requests
- `MemVaultError`: Generic error with status code

---

## 🔄 Automatic Retry

The SDK automatically retries failed requests with exponential backoff:

- Network errors: Retries 3 times (configurable)
- Timeout errors: Retries with backoff
- Authentication errors: No retry (fails immediately)

```typescript
const memvault = new MemVault(apiKey, {
  maxRetries: 5,  // Increase for unreliable networks
  timeout: 60000  // 60 second timeout
});
```

---

## 🔧 Advanced Usage

### Custom Base URL

For self-hosted or enterprise deployments:

```typescript
const memvault = new MemVault(apiKey, {
  baseUrl: 'https://memvault.your-company.com'
});
```

### Batch Operations

```typescript
const memories = [
  "Employee onboarding checklist updated",
  "New security policy effective April 1",
  "Office relocation scheduled for Q3"
];

// Add multiple memories
const results = await Promise.all(
  memories.map(content => memvault.addMemory(content))
);

console.log(`Added ${results.length} memories`);
```

### TypeScript Support

Full TypeScript definitions included:

```typescript
import { MemVault, Memory, Entity, AskResponse } from '@memvault/client';

const memvault = new MemVault(apiKey);

const answer: AskResponse = await memvault.ask("What's our Q4 plan?");
const memory: Memory = answer.sources[0];
const entity: Entity = answer.entities[0];
```

---

## 📊 Monitoring & Debugging

### Check Credits

```typescript
const user = await memvault.getUser();
console.log(`Credits remaining: ${user.creditsBalance}`);
console.log(`Tier: ${user.tier}`);
```

### Track Job Status

Memory processing is asynchronous. Track with the job ID:

```typescript
const result = await memvault.addMemory("Important update");
console.log(`Job queued: ${result.jobId}`);
// Job processing happens in background
```

---

## 🤝 Contributing

Issues and PRs welcome at [github.com/memvault/memvault-sdk](https://github.com/memvault/memvault-sdk)

## 📄 License

MIT

## 🔗 Links

- [Dashboard](https://memvault.io/dashboard)
- [API Documentation](https://docs.memvault.io)
- [Pricing](https://memvault.io/pricing)
- [Support](https://memvault.io/support)
