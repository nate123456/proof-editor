# Development Principles

*Core guidelines for building maintainable, scalable AI systems.*

## SOLID Principles

**Single Responsibility**: Each class handles one concern
**Open/Closed**: Extend through interfaces, not modification
**Liskov Substitution**: Subtypes must be substitutable
**Interface Segregation**: Use focused, specific interfaces
**Dependency Inversion**: Depend on abstractions, inject dependencies

```typescript
// Good: Focused responsibilities
interface LLMProvider {
  query(prompt: string, context: Context): Promise<Response>;
}

class AgentOrchestrator {
  constructor(
    private llmProvider: LLMProvider,
    private communicator: CommunicationService
  ) {}
}
```

## Core Principles

**KISS**: Simple solutions over complex ones
**YAGNI**: Build only what's needed now
**DRY**: Extract common patterns, avoid duplication

## Clean Architecture

**Dependencies point inward only**. Domain layer defines interfaces, infrastructure implements them.

```
Infrastructure → Application → Domain
```

**Domain**: Business rules, entities, value objects
**Application**: Use cases, orchestration
**Infrastructure**: External APIs, databases, frameworks
**Interface**: Controllers, API endpoints

```typescript
// Domain defines interface
interface ITopicRepository {
  save(topic: Topic): Promise<void>;
}

// Application uses abstraction
class TopicService {
  constructor(private repository: ITopicRepository) {}
}

// Infrastructure implements
class FileTopicRepository implements ITopicRepository {
  async save(topic: Topic): Promise<void> { /* implementation */ }
}
```

## Code Quality

**NO COMMENTS RULE**: Code must be self-documenting. Comments indicate poor code quality.

**CODE TELLS A STORY**: Names must read naturally when used together. The code should flow like well-written prose.

**Naming for Readability**:
- **Think about how names read in context**: `user.hasPermissionToEdit(document)` reads naturally
- **Variable names reveal their role**: `unprocessedOrders`, `eligibleCandidates`, `completedMilestones`  
- **Method names describe actions clearly**: `calculateTotalWithTax()`, `validateUserPermissions()`
- **Class names establish clear actors**: `PaymentProcessor`, `EmailValidator`, `TopicCompletionService`
- **Boolean names read as questions**: `isActive()`, `hasPermission()`, `canComplete()`

**Comments are a LAST RESORT**:
- Only when domain complexity cannot be expressed in code
- Never explain WHAT the code does - the code should show that
- Never leave LLM commentary or version comparisons

```typescript
// ✅ Reads like a story - natural flow
class TopicCompletionService {
  async completeTopicWithAllCriteriaMet(topicId: TopicId): Promise<void> {
    const topic = await this.repository.findById(topicId);
    if (!topic.areAllCriteriaMet()) {
      throw new IncompleteCriteriaError(topicId);
    }
    topic.markAsCompleted();
    await this.repository.save(topic);
  }
}

// Usage reads naturally:
// await service.completeTopicWithAllCriteriaMet(topicId);
// if (topic.areAllCriteriaMet()) { ... }
// user.hasPermissionToEdit(document)

// ❌ Poor story - unclear when used
class Service {
  async process(id: string): Promise<void> {
    const data = await this.repo.get(id);
    if (!data.check()) {
      throw new Error('Failed');
    }
    data.update();
    await this.repo.save(data);
  }
}
```

**Clean**: Remove complexity, dead code, confusing constructs  
**Organized**: Consistent structure and patterns
**Readable**: Easy to scan and understand instantly

## Async Programming

**Use async/await for sequential operations, Promises for parallel execution**

```typescript
// Sequential processing
async function processAgentMessage(agentId: AgentId, message: string): Promise<void> {
  const agent = await this.repository.findById(agentId);
  const response = await this.llmProvider.query(message, agent.getContext());
  await this.communicator.send(response);
}

// Parallel processing
async function spawnAgentTeam(configs: AgentConfig[]): Promise<Agent[]> {
  const spawnPromises = configs.map(config => this.spawnAgent(config));
  return Promise.all(spawnPromises);
}

// Streaming with async generators
async function* streamAgentThoughts(agent: Agent, prompt: string): AsyncGenerator<ThoughtChunk> {
  const stream = await this.llmProvider.createStream(prompt, agent.getContext());
  try {
    for await (const chunk of stream) {
      yield await this.processThoughtChunk(chunk);
    }
  } finally {
    await stream.close();
  }
}
```

## Domain-Driven Design (DDD)

**Organize code around business domains with clear boundaries**

**Bounded Contexts**: Agent, Communication, Topic, Team, Integration

```typescript
// Rich domain models
class Agent {
  constructor(
    private id: AgentId,
    private config: AgentConfig,
    private memory: AgentMemory
  ) {}
  
  processMessage(message: Message): Response {
    // Business logic here
  }
}

// Domain services for complex operations
class AgentSpawningService {
  async spawnAgent(config: AgentConfig): Promise<Agent> {
    // Complex creation logic
  }
}
```

## Modern Stack (2025)

**Node.js 22 LTS, TypeScript strict mode, ES Modules**

**Tools**: pnpm, biome.js, vitest, esbuild

**Structure**: Domain → Application → Infrastructure → Interface

```
src/
├── domain/          # Business entities and rules
├── application/     # Use cases and orchestration  
├── infrastructure/  # External integrations
└── interfaces/      # API endpoints and UI
```

## Test-Driven Development (TDD)

**Red-Green-Refactor cycle: Write failing test → Make it pass → Improve code**

**Testing Framework**: Vitest (fast, TypeScript native, Jest-compatible)

**Strategy**:
- **Unit Tests**: High coverage for business logic, mock external dependencies
- **Integration Tests**: Critical component interactions  
- **Functional Tests**: End-to-end workflows (minimal for MVP)

```typescript
// 1. RED: Write failing test
describe('AgentSpawner', () => {
  it('should create agent with valid configuration', async () => {
    const spawner = new AgentSpawner(mockLLMProvider);
    const config = createValidAgentConfig();
    
    const agent = await spawner.spawn(config);
    
    expect(agent.getId()).toBeDefined();
    expect(agent.getConfig()).toEqual(config);
  });
});

// 2. GREEN: Minimal implementation
class AgentSpawner {
  async spawn(config: AgentConfig): Promise<Agent> {
    return new Agent(generateId(), config);
  }
}

// 3. REFACTOR: Improve while keeping tests green
```

**AI-Specific Testing**:
- Mock LLM APIs with MSW
- Test streaming responses and timeouts
- Validate agent coordination and memory persistence

## Error Handling & Resilience

**Business logic uses Result pattern, infrastructure uses exceptions**

**Result Pattern**:
- Use for: Domain operations, validation, business rules
- Not for: Infrastructure failures, programming errors

```typescript
// Result type
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Domain usage
class TopicId {
  static create(value: string): Result<TopicId, ValidationError> {
    if (!value) {
      return { success: false, error: new ValidationError('TopicId required') };
    }
    return { success: true, data: new TopicId(value) };
  }
}

// Application composition
async function createTopic(request: CreateTopicRequest): Promise<Result<Topic, DomainError>> {
  const idResult = TopicId.create(request.id);
  if (!idResult.success) {
    return { success: false, error: idResult.error };
  }
  
  const topic = Topic.create(idResult.data, request.title);
  if (!topic.success) {
    return { success: false, error: topic.error };
  }
  
  return await repository.save(topic.data);
}

// Convert at boundaries
class TopicController {
  async createTopic(req: Request, res: Response): Promise<void> {
    const result = await this.service.createTopic(req.body);
    
    if (!result.success) {
      res.status(400).json({ error: result.error.message });
      return;
    }
    
    res.status(201).json(result.data);
  }
}
```

**Circuit Breaker**: Prevent cascading failures with automatic recovery

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Performance & Scalability

**Stream large responses, limit concurrency, enable garbage collection**

```typescript
// Memory-efficient streaming
async function* streamAgentResponse(agent: Agent, prompt: string) {
  const stream = agent.processStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
    if (global.gc) global.gc(); // Allow GC between chunks
  }
}

// Concurrency control
class AgentPool {
  private readonly maxConcurrency = 10;
  private active = new Set<Agent>();

  async processTask(task: Task): Promise<Result> {
    if (this.active.size >= this.maxConcurrency) {
      await this.waitForAvailability();
    }
    
    const agent = await this.getOrCreateAgent(task.type);
    this.active.add(agent);
    
    try {
      return await agent.process(task);
    } finally {
      this.active.delete(agent);
      this.processQueue();
    }
  }
}
```

## Security

**Validate all inputs, use rate limiting, secure headers, API key authentication**

```typescript
// Input validation with zod
const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['pm', 'specialist', 'worker']),
  capabilities: z.array(z.string()),
  llmProvider: z.enum(['claude', 'gemini', 'openai'])
});

// API security
app.use(helmet()); // Security headers
app.use('/api/agents', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api', validateApiKey);
```

## Configuration

**Type-safe configuration with validation and defaults**

```typescript
const ConfigSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']),
  llm: z.object({
    claude: z.object({
      apiKey: z.string(),
      maxTokens: z.number().default(4000)
    }),
    gemini: z.object({
      apiKey: z.string(),
      model: z.string().default('gemini-2.5-flash')
    })
  })
});

export const config = ConfigSchema.parse({
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  llm: {
    claude: { apiKey: process.env.CLAUDE_API_KEY },
    gemini: { apiKey: process.env.GEMINI_API_KEY }
  }
});
```

## Monitoring

**Structured logging with Pino, metrics with Prometheus**

```typescript
// Structured logging
const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug'
});

logger.info({ agentId: 'agent-123', action: 'message_sent' }, 'Agent sent message');
logger.error({ error: err, agentId: 'agent-123' }, 'Agent processing failed');

// Metrics collection
const agentProcessingTime = new client.Histogram({
  name: 'agent_processing_duration_seconds',
  help: 'Time spent processing agent requests',
  labelNames: ['agent_type', 'llm_provider']
});
```

## Development Workflow

**Feature branches, conventional commits, PR reviews, automated CI/CD**

**Code Review Checklist**:
- [ ] Tests written and passing
- [ ] Type safety maintained  
- [ ] Error handling implemented
- [ ] No comments (self-documenting code)
- [ ] Security implications reviewed

```yaml
# CI/CD Pipeline
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint  
      - run: pnpm run test
```

## Prototyping Guidelines

**MVP Test Priorities**: Unit tests (high) → Integration tests (medium) → E2E tests (low)

**AI-Specific Considerations**:
- Mock LLM APIs to avoid costs and flaky responses
- Configure 30s+ timeouts for real LLM API calls  
- Test streaming and concurrent agent scenarios
- Document shortcuts taken during prototyping
- Maintain code quality for core components, allow flexibility for experiments

---
