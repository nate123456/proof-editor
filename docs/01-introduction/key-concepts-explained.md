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

### 2. Connections and Tree Structure (Two Complementary Views)

Proof Editor provides two important perspectives on your logical arguments:

#### Logical Connections
Arguments CAN connect when the conclusion of one step matches a premise in another step. These are potential logical relationships based on shared content.

**Example of Connectable Steps:**
```
Step 1: All birds can fly + Tweety is a bird → Tweety can fly
Step 2: Tweety can fly + Flying things reach high places → Tweety can reach high places
Step 3: Tweety can fly + Flying requires wings → Tweety has wings
```

**The Potential**: Steps 2 and 3 both COULD use Step 1's conclusion.

#### Tree Structure  
When you actually BUILD a proof, you create a tree by choosing which connections to use and where to position them.

**Example Tree Built from Above Steps:**
```
        Step 1 (Tweety can fly)
               ↓
        Step 2 (reaches high places)
```

**Key Insight**: Step 3 remains available but unused in this particular tree. You chose to connect Step 1 to Step 2, creating a specific proof path.

**In Proof Editor:**
- **Connections**: The system shows you what CAN connect logically
- **Tree Building**: You decide what DOES connect by branching
- **Position Matters**: When branching, you select which premise position to fill
- **Multiple Trees**: The same arguments can be arranged differently in different trees

**Why This Dual View Matters:**
- **Exploration**: See all possible logical connections before committing
- **Flexibility**: Build different proof trees from the same logical components  
- **Reusability**: Use the same logical step multiple times in different positions
- **Clarity**: Distinguish between "what's logically valid" and "what I'm actually using"

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