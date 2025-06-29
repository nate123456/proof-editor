# Key Concepts Explained Simply

*Understanding the building blocks of logical reasoning in Proof Editor*

## The Basic Idea

Proof Editor helps you build logical arguments piece by piece, then connect those pieces into complete reasoning chains. Think of it like constructing a building: you need individual bricks (logical steps), and you need to connect them properly (logical relationships) to create something solid (valid arguments).

## The Three Main Parts

### 1. Logical Steps (What We Call "Atomic Arguments")

A logical step is the smallest unit of reasoning - one inference from premises to conclusion.

**Example:**
```
Given: All birds can fly
Given: Tweety is a bird
Therefore: Tweety can fly
```

This is one logical step. You have some premises (the "given" statements) and you draw one conclusion from them.

**In Proof Editor:**
- The premises appear above a horizontal line
- The conclusion appears below the line
- The line itself represents the logical inference

**Why "Atomic"?** 
Just like atoms are the smallest building blocks of matter, atomic arguments are the smallest building blocks of reasoning. You can't break them down into smaller logical pieces without losing the logical connection.

### 2. Connections (How Steps Link Together)

Arguments connect when the conclusion of one step becomes a premise in another step. In Proof Editor, this happens by sharing the same logical structure - not just the same text.

**Key insight**: When you use a conclusion as a premise in another step, you're not just copying the text - you're creating a shared logical connection. If you change the shared statement, it updates everywhere it's connected.

**Example of Connected Steps:**

**Step 1:**
```
Given: All birds can fly
Given: Tweety is a bird  
Therefore: Tweety can fly
```

**Step 2:**
```
Given: Tweety can fly
Given: Flying things can reach high places
Therefore: Tweety can reach high places
```

**The Connection:** Step 1's conclusion "Tweety can fly" becomes Step 2's premise "Tweety can fly". This creates a logical chain.

**In Proof Editor:**
- When you connect steps by branching, they share the same logical structure
- You can see the logical flow visually
- If you change a connected statement, it updates in all connected places
- The same statement text can appear in unconnected steps without creating automatic connections

**Why This Matters:**
- Intentional connections - you control which steps connect to each other
- Consistency in connected steps - change a connected statement once, it updates throughout connected steps
- Visual clarity - see how your reasoning flows from premises to final conclusions
- Statement reuse - the same statement text can appear in multiple unconnected places when needed

### 3. Complete Arguments (Connected Chains of Reasoning)

A complete argument includes all the logical steps needed to get from your starting premises to your final conclusion, with no gaps.

**Example of Complete vs. Incomplete:**

**Incomplete (Missing Steps):**
```
Step 1: All birds can fly → Tweety can fly
Step 3: Tweety can reach high places
```
*Missing: How do we get from "Tweety can fly" to "Tweety can reach high places"?*

**Complete (All Steps Included):**
```
Step 1: All birds can fly + Tweety is a bird → Tweety can fly
Step 2: Tweety can fly + Flying things reach high places → Tweety can reach high places
```
*Every logical step is explicit and justified.*

**In Proof Editor:**
- The system helps you identify missing steps
- You can see your complete reasoning chain visually
- Gaps become obvious and easy to fill

## How These Work Together

### Building Up Complexity
1. **Start Simple:** Begin with basic logical steps
2. **Connect Steps:** Link conclusions to new premises  
3. **Build Chains:** Create longer sequences of reasoning
4. **Verify Completeness:** Ensure no logical gaps

### Visual Understanding
- **Individual Steps:** See each inference clearly
- **Connections:** Follow the logical flow with your eyes
- **Complete Picture:** Understand your entire argument structure
- **Patterns:** Recognize common reasoning patterns

## Common Patterns You'll See

### Linear Reasoning (Chain of Logic)
```
A → B → C → D
```
Each step leads to the next in sequence.

### Branching Reasoning (Multiple Conclusions)
```
    A
   / \
  B   C
  |   |
  D   E
```
One premise supports multiple lines of reasoning.

### Converging Reasoning (Multiple Premises)
```
  A   B
   \ /
    C
    |
    D
```
Multiple premises combine to support one conclusion.

### Complex Reasoning (Combination)
```
    A
   /|\
  B C D
   \|/
    E
    |
    F
```
Real arguments often combine all these patterns.

## Why This Approach Works

### For Learning
- **Visual Clarity:** See how logic works, don't just read about it
- **Step-by-Step:** Build understanding gradually
- **Error Detection:** Mistakes become visible
- **Pattern Recognition:** Learn to recognize common reasoning structures

### For Teaching  
- **Demonstration:** Show students how reasoning works
- **Interaction:** Let students build their own arguments
- **Assessment:** See exactly where students struggle
- **Engagement:** Make abstract logic concrete and visual

### For Professional Work
- **Clarity:** Present complex reasoning clearly to colleagues
- **Verification:** Ensure your arguments are sound
- **Collaboration:** Work together on complex reasoning
- **Documentation:** Create clear records of your reasoning process

## What's Different About Proof Editor's Approach

### Traditional Text Proofs
- Linear presentation (line by line)
- Connections implied, not explicit
- Hard to see overall structure
- Difficult to modify without rewriting

### Proof Editor's Visual Approach
- Spatial representation (see relationships)
- Connections explicit and visual
- Structure immediately apparent
- Easy to modify and experiment

### Traditional Logical Software
- Assumes expert knowledge
- Focuses on verification, not construction
- Limited to specific logical systems
- Requires programming knowledge

### Proof Editor's User-Centered Approach
- Designed for learning and construction
- Works with any logical system
- No programming required
- Helps you become an expert

## Moving Forward

Now that you understand the basic concepts, you're ready to:

1. **[Build Your First Proof](your-first-proof.md)** - Try the concepts hands-on
2. **[Understanding Logic Systems](logic-systems-intro.md)** - Learn about different types of reasoning
3. **[Working with Complex Arguments](complex-arguments.md)** - Handle real-world reasoning challenges

Remember: You don't need to understand everything at once. Start with simple examples, build your confidence, then tackle more complex reasoning patterns. The visual approach makes logical reasoning more intuitive and accessible than traditional methods.