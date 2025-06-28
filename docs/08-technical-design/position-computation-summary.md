# Position Computation Model - Summary of Changes

## The Fundamental Reconceptualization

### Previous Model (Incorrect)
- Each atomic argument had its own stored position via `SPATIAL_POSITION` entity
- Positions were treated as independent data
- Documents referenced atomic arguments through individual positions

### New Model (Correct)
- **Trees have positions** - where they're anchored in documents
- **Atomic arguments have computed positions** - derived from tree structure
- **Layout flows from connections** - positions are algorithmic, not stored

## Key Insights

1. **Positions are emergent, not empirical**
   - Just like argument trees emerge from connections
   - Individual positions emerge from tree structure + layout algorithm

2. **One source of truth**
   - Connections define structure
   - Structure determines layout
   - No possibility of positions contradicting connections

3. **Flexibility through computation**
   - Change layout algorithms without data migration
   - Support multiple layout styles per tree
   - Enable dynamic repositioning

## Data Model Changes

### Removed
- `SPATIAL_POSITION` entity (was junction table for atomic arguments)

### Added
- `TREE_POSITION` - Anchors entire trees in documents
- `POSITION_OVERRIDE` - Optional manual adjustments

### Tree Position Entity
```typescript
{
  document_id: string
  root_argument_id: string  // which atomic argument is the tree root
  x: number                 // anchor point
  y: number                 // anchor point
  layout_style: enum        // top-down, bottom-up, radial, etc.
  layout_params: json       // spacing, alignment preferences
}
```

## Algorithm Overview

```
1. Start with tree anchor position (x, y)
2. Identify root(s) - atomic arguments with no incoming connections
3. Position root at anchor
4. For each child:
   - Calculate position based on parent + layout rules
   - Consider siblings for spacing
   - Apply layout style (top-down, radial, etc.)
5. Apply any position overrides
```

## Benefits

1. **Consistency** - Visual layout always reflects logical structure
2. **Efficiency** - Store less data (only tree anchors)
3. **Correctness** - Impossible for positions to contradict connections
4. **Flexibility** - Change layout without changing data
5. **Simplicity** - One source of truth (connections)

## Files Updated

1. **conceptual-data-model.md**
   - Updated ERD to show TREE_POSITION and POSITION_OVERRIDE
   - Added position computation section
   - Fixed all references to individual positions

2. **dag-data-model.md**
   - Added Position Management section
   - Included layout algorithm interfaces
   - Updated design rationale

3. **technical-definitions.md**
   - Replaced SpatialPositionEntity with TreePositionEntity
   - Added PositionOverrideEntity
   - Added position computation algorithm
   - Updated stored vs computed lists

4. **documents.md**
   - Updated to reflect tree positioning
   - Clarified that individual positions are computed

5. **visual-proof.md**
   - Updated spatial representation section
   - Changed direct manipulation to tree-level

6. **key-terms.md**
   - Updated Document definition

## Philosophy Alignment

This change aligns perfectly with the core principle: **logical structure drives everything**. Just as:
- Argument trees emerge from connections
- Validation emerges from language layers
- Now positions emerge from tree structure

The visual representation is a computed view of the logical structure, not independent data that could drift out of sync.