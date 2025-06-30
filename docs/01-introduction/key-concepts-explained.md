# Key Concepts Explained Simply

*Understanding how statements flow through processing units in Proof Editor*

## The Basic Idea

Proof Editor helps you build reasoning systems where statements flow between processing units to create logical conclusions. Think of it like building a factory: you have raw materials (statements), processing stations (atomic arguments), and conveyor belts (connections) that move materials between stations to create finished products (conclusions).

## The Three Main Parts

### 1. Statements (The Building Blocks)

Statements are pieces of text that flow through your reasoning system. They are the fundamental building blocks - everything else is built from statements.

**Examples:**
- "All birds can fly"
- "Tweety is a bird"
- "Tweety can fly"

**In Proof Editor:**
- Statements are the raw material that flows through your system
- The same statement can be used in multiple places
- When you change a statement, it updates everywhere it flows

### 2. Processing Units (What We Call "Atomic Arguments")

A processing unit takes input statements (premises) and produces output statements (conclusions). It's like a machine in a factory that transforms raw materials.

**Example Processing Unit:**
```
Input statements:  "All birds can fly", "Tweety is a bird"
      ↓ (Processing happens here)
Output statement: "Tweety can fly"
```

**In Proof Editor:**
- Input statements appear above a horizontal line
- Output statements appear below the line
- The line itself represents the processing transformation
- Each processing unit handles one logical transformation

### 3. Statement Flow and Physical Trees

Proof Editor creates physical systems where statements flow between processing units. This is not abstract - it's how the system actually works.

#### Statement Flow Channels
When processing units connect, statements can flow from the output of one unit to the input of another unit. These are actual flow paths in your reasoning system.

**Example Statement Flow:**
```
Unit 1 outputs: "Tweety can fly"
         ↓ (Statement flows through connection)
Unit 2 receives: "Tweety can fly" (as input)
Unit 2 outputs: "Tweety can reach high places"
```

**The Physical Reality**: When you connect units, you create an actual channel where statements flow from one unit's output container to another unit's input container.

#### Physical Tree Structure  
When you build your reasoning system, you create a physical tree where processing units are positioned and connected. **Children provide statements upward to their parents.**

**Example Physical Tree:**
```
     Parent Unit (needs "Tweety can fly" as input)
            ↑ (Statement flows upward)
     Child Unit (provides "Tweety can fly" as output)
```

**Key Insight**: The tree structure is bottom-up flow. Child processing units feed statements up to their parent units.

**In Proof Editor:**
- **Statement Channels**: You create actual flow paths between processing units
- **Physical Positioning**: Processing units exist at specific locations in your workspace
- **Bottom-up Flow**: Child units provide the statements their parent units need
- **Multiple Instances**: The same processing unit template can be used multiple times in different positions

### 4. Complete Flow Networks (Connected Processing Systems)

A complete flow network includes all the processing units needed to transform your input statements into your final output statements, with no gaps in the flow.

**Example of Complete vs. Incomplete Flow:**

**Incomplete (Missing Processing Unit):**
```
Unit 1: "All birds can fly" + "Tweety is a bird" → "Tweety can fly"
         ??? (No connection)
Unit 3: ??? → "Tweety can reach high places"
```
*Missing: How does "Tweety can fly" flow to become "Tweety can reach high places"?*

**Complete (All Processing Units Connected):**
```
Unit 1: "All birds can fly" + "Tweety is a bird" → "Tweety can fly"
         ↓ ("Tweety can fly" flows down)
Unit 2: "Tweety can fly" + "Flying things reach high places" → "Tweety can reach high places"
```
*Every statement flows through explicit processing units.*

**In Proof Editor:**
- The system helps you identify broken flow paths
- You can see your complete statement processing network visually
- Missing processing units become obvious and easy to add

## How These Work Together

### Building Processing Networks
1. **Start Simple:** Create basic processing units with statements
2. **Connect Units:** Establish statement flow channels between units  
3. **Build Networks:** Create longer chains of statement processing
4. **Verify Flow:** Ensure statements can flow from inputs to outputs without gaps

### Physical Understanding
- **Individual Units:** See each processing transformation clearly
- **Flow Channels:** Follow statement movement with your eyes
- **Complete System:** Understand your entire statement processing network
- **Patterns:** Recognize common processing unit arrangements

## Common Patterns You'll See

### Linear Processing (Chain Flow)
```
Unit A → Unit B → Unit C → Unit D
```
Statements flow through processing units in sequence.

### Branching Flow (Multiple Output Channels)
```
    Unit A (outputs multiple statements)
       ↓↓
   Unit B  Unit C
      ↓       ↓
   Unit D  Unit E
```
One processing unit's outputs feed multiple other units.

### Converging Flow (Multiple Input Channels)
```
Unit A    Unit B
    ↓      ↓ 
     Unit C (combines inputs)
        ↓
     Unit D
```
Multiple processing units feed their outputs to one unit.

### Complex Networks (Combined Flow)
```
      Unit A
    ↙   ↓   ↘
Unit B Unit C Unit D
    ↘   ↓   ↙
      Unit E
        ↓
      Unit F
```
Real reasoning systems often combine all these flow patterns.

## Why This Approach Works

### For Learning
- **Physical Understanding:** See how statements flow through reasoning systems
- **Hands-on Building:** Construct processing networks gradually
- **Flow Debugging:** Broken statement flows become visible
- **Pattern Recognition:** Learn to recognize common processing network structures

### For Teaching  
- **System Demonstration:** Show students how reasoning systems work
- **Interactive Building:** Let students construct their own processing networks
- **Flow Analysis:** See exactly where statement flow breaks down
- **Concrete Systems:** Make abstract logic into working systems

### For Professional Work
- **System Clarity:** Present complex reasoning as functioning systems
- **Flow Verification:** Ensure your statement processing works correctly
- **Network Collaboration:** Work together on complex reasoning systems
- **System Documentation:** Create clear records of your reasoning networks

## What's Different About Proof Editor's Approach

### Traditional Text Proofs
- Linear presentation (line by line)
- Statement flow hidden and implicit
- Hard to see overall processing structure
- Difficult to modify without rewriting entire sequences

### Proof Editor's Physical System Approach
- Spatial representation (see statement flow)
- Statement channels explicit and visual
- Processing network structure immediately apparent
- Easy to modify processing units and reconnect flow channels

### Traditional Logical Software
- Assumes expert knowledge
- Focuses on verification, not system construction
- Limited to specific logical systems
- Requires programming knowledge

### Proof Editor's System-Building Approach
- Designed for constructing reasoning systems
- Works with any statement processing logic
- No programming required
- Helps you build working reasoning systems

## Moving Forward

Now that you understand the basic concepts, you're ready to:

1. **[Build Your First Proof](your-first-proof.md)** - Try the concepts hands-on
2. **[Understanding Logic Systems](logic-systems-intro.md)** - Learn about different types of reasoning
3. **[Working with Complex Arguments](complex-arguments.md)** - Handle real-world reasoning challenges

Remember: You don't need to understand everything at once. Start with simple processing units, build your confidence, then tackle more complex statement flow networks. The physical system approach makes logical reasoning more concrete and accessible than traditional methods.