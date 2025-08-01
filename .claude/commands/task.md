# Task Execution Command

<task>
You are a task execution orchestrator that picks up available tasks from the tasks/available/ folder, moves them to tasks/active/, delegates work to a task agent, verifies completion, and cleans up upon successful completion.
</task>

<context>
Key Reference: DEV_PRINCIPLES.md (project development standards)
Project Config: package.json (project setup and scripts)
Task Structure: tasks/available/ → tasks/active/ → deletion upon completion

This command implements a complete task lifecycle:
1. Selects first available task from tasks/available/
2. Moves task file to tasks/active/ (claiming it)
3. Delegates implementation to a task agent
4. Launches verification agent to confirm completion
5. Deletes task file upon successful verification

Quality Gates: Prettier → TypeScript → ESLint → Tests → 95% Coverage
</context>

<workflow_process>
```mermaid
flowchart TD
    A[/task command] --> B[Check tasks/available/]
    B --> C{Any tasks available?}
    C -->|No| D[Report: No tasks available]
    C -->|Yes| E[Select first task]
    E --> F[Move to tasks/active/]
    F --> G[Launch Implementation Agent]
    G --> H[Wait for completion]
    H --> I[Launch Verification Agent]
    I --> J{Verification passed?}
    J -->|No| K[Report issues, keep in active/]
    J -->|Yes| L[Delete task file]
    L --> M[Report success]
    
    style A fill:#e1f5fe
    style M fill:#c8e6c9
    style D fill:#ffecb3
    style K fill:#ffcdd2
```

**Sequential Process**:
1. **Discovery**: Find available tasks
2. **Claim**: Move to active folder
3. **Implementation**: Task agent does the work
4. **Verification**: Separate agent verifies completion
5. **Cleanup**: Delete task file if successful
</workflow_process>

<task_selection>
## Task Selection Logic

**Available Tasks Directory**: `tasks/available/`
**Active Tasks Directory**: `tasks/active/`

```bash
# Find first available task
first_task=$(ls tasks/available/*.md 2>/dev/null | head -1)

# If no tasks available
if [ -z "$first_task" ]; then
    echo "No tasks available in tasks/available/"
    exit 0
fi

# Extract task name for active folder
task_name=$(basename "$first_task")
active_path="tasks/active/$task_name"

# Move to active (claiming the task)
mv "$first_task" "$active_path"
```

**Task File Structure Expected**:
```markdown
# Task Title

## Problem Description
[What needs to be done]

## Technical Approach
[How to solve it]

## Files to Modify
[List of files]

## Validation Criteria
[How to verify success]

## Quality Requirements
[Specific standards to meet]
```
</task_selection>

<implementation_agent>
## Implementation Agent Instructions

**Agent Role**: Task Implementation Specialist
**Agent Scope**: Single task execution with quality enforcement

**Agent Prompt Template**:
```
You are implementing a specific task from the tasks/active/ folder. Your job is to:

1. FIRST: Read DEV_PRINCIPLES.md and follow ALL development standards
2. Read the task file completely and understand all requirements
3. Implement the solution following the technical approach
4. Ensure all quality gates pass: Prettier → TypeScript → ESLint → Tests → 95% Coverage
5. Report completion with detailed summary

CRITICAL REQUIREMENTS:
- Follow DEV_PRINCIPLES.md exactly (no comments, self-documenting code, Result pattern, etc.)
- Use neverthrow Result types for all error handling
- Ensure 95% test coverage minimum
- Run all quality checks before reporting completion
- Work only on files specified in the task

QUALITY GATES (must pass in order):
1. npm run format (Prettier)
2. npm run type-check (TypeScript)
3. npm run lint (ESLint)
4. npm test (Vitest with 95% coverage)

Task file: {task_file_path}
```

**Agent Success Criteria**:
- All files specified in task are properly modified
- All quality gates pass with zero issues
- Implementation matches technical approach
- Tests added for new functionality
- 95% coverage maintained
</implementation_agent>

<verification_agent>
## Verification Agent Instructions

**Agent Role**: Task Completion Validator
**Agent Scope**: Verify task was completed correctly

**Agent Prompt Template**:
```
You are verifying that a task has been completed successfully. Your job is to:

1. Read the original task requirements from {task_file_path}
2. Verify each validation criterion is met
3. Run all quality checks to ensure they pass
4. Check that the problem described in the task is actually solved
5. Report PASS or FAIL with detailed reasoning

VERIFICATION CHECKLIST:
- [ ] All files mentioned in task were modified appropriately
- [ ] Technical approach was followed
- [ ] All validation criteria are met
- [ ] Quality gates all pass (format, type-check, lint, test)
- [ ] 95% test coverage maintained
- [ ] No regressions introduced
- [ ] Solution actually solves the stated problem

QUALITY VERIFICATION:
1. Run npm run format --check (must pass)
2. Run npm run type-check (must pass)
3. Run npm run lint (must pass)
4. Run npm test (must pass with 95% coverage)

Return: PASS (with summary) or FAIL (with specific issues)
```

**Verification Criteria**:
- Implementation matches task requirements
- All quality gates pass
- No regressions introduced
- Test coverage meets 95% threshold
- Solution actually solves the problem
</verification_agent>

<orchestration_logic>
## Command Orchestration

**Step 1: Task Discovery**
```bash
# Check for available tasks
if [ ! -d "tasks/available" ] || [ -z "$(ls tasks/available/*.md 2>/dev/null)" ]; then
    echo "No tasks available in tasks/available/"
    exit 0
fi
```

**Step 2: Task Claiming**
```bash
# Select and move first task
first_task=$(ls tasks/available/*.md | head -1)
task_name=$(basename "$first_task")
mkdir -p tasks/active
mv "$first_task" "tasks/active/$task_name"
echo "Claimed task: $task_name"
```

**Step 3: Implementation Phase**
```javascript
// Launch implementation agent
const implementationAgent = await Task.invoke({
    description: "Implement task",
    prompt: `${implementationAgentPrompt}
    
    Task file: tasks/active/${taskName}`
});

// Wait for completion
await implementationAgent.complete();
```

**Step 4: Verification Phase**
```javascript
// Launch verification agent
const verificationAgent = await Task.invoke({
    description: "Verify task completion",
    prompt: `${verificationAgentPrompt}
    
    Task file: tasks/active/${taskName}`
});

const verificationResult = await verificationAgent.complete();
```

**Step 5: Cleanup**
```javascript
if (verificationResult.includes('PASS')) {
    // Delete task file
    await fs.unlink(`tasks/active/${taskName}`);
    console.log(`Task completed successfully: ${taskName}`);
} else {
    console.log(`Task verification failed: ${taskName}`);
    console.log(`Task remains in tasks/active/ for review`);
}
```
</orchestration_logic>

<error_handling>
## Error Scenarios

**No Available Tasks**:
- Report: "No tasks available in tasks/available/"
- Exit cleanly without error

**Task File Malformed**:
- Report specific formatting issues
- Move task back to tasks/available/
- Request human review

**Implementation Failure**:
- Keep task in tasks/active/
- Report specific failure reasons
- Suggest next steps for resolution

**Verification Failure**:
- Keep task in tasks/active/
- Report verification issues
- Allow manual review and retry

**Quality Gate Failures**:
- Report specific quality issues
- Keep task in tasks/active/
- Provide guidance for resolution
</error_handling>

<usage_examples>
## Command Usage

```bash
# Execute next available task
/task

# Expected output:
# "Claimed task: 001-fix-authentication-bug.md"
# "Launching implementation agent..."
# "Implementation completed"
# "Launching verification agent..."
# "Verification: PASS"
# "Task completed successfully: 001-fix-authentication-bug.md"
```

**Task Lifecycle Example**:
1. `tasks/available/001-fix-auth-bug.md` exists
2. Command moves it to `tasks/active/001-fix-auth-bug.md`
3. Implementation agent reads task and implements solution
4. Verification agent confirms all criteria met
5. Task file is deleted (success)
</usage_examples>

<success_criteria>
## Command Success Criteria

**Task Completed Successfully**:
- [ ] Task file moved from available/ to active/
- [ ] Implementation agent completed without errors
- [ ] All quality gates passed (format, type-check, lint, test)
- [ ] 95% test coverage maintained
- [ ] Verification agent returned PASS
- [ ] Task file deleted from active/
- [ ] No regressions introduced

**Quality Standards**:
- DEV_PRINCIPLES.md followed exactly
- neverthrow Result pattern used
- Self-documenting code (no comments)
- Proper error handling
- Test coverage at 95% minimum
</success_criteria>

<human_review_needed>
Flag decisions needing verification:
- [ ] Task directory structure (tasks/available/ → tasks/active/)
- [ ] Agent coordination approach (sequential vs parallel)
- [ ] Verification criteria completeness
- [ ] Error handling for edge cases
- [ ] Integration with existing quality gates
</human_review_needed>

ARGUMENTS: None - processes first available task automatically