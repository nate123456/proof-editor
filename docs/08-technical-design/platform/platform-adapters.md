# Platform Adapter Implementation Details

## Introduction

This document describes the implementation design of platform adapters - the abstraction layer between Proof Editor's core business logic and platform-specific implementations. Adapters are implementation details that handle platform differences, not architectural concerns. Both VS Code and React Native provide sufficient capabilities for all requirements.

## Adapter Implementation Philosophy

### Implementation Principles
- **Sufficient Capabilities**: Both platforms provide complete feature sets
- **Clean Separation**: Adapters handle "how" while core focuses on "what"
- **Implementation Details**: Platform differences are coding concerns, not architecture
- **No Blockers**: All required functionality is available on both platforms
- **Code Reuse**: Enable maximum sharing of core business logic

### Common Patterns
All adapters follow consistent patterns:
- **Initialization**: Platform-specific setup and configuration
- **Operation**: Core functionality exposed through simple abstractions
- **Observation**: Event-based updates for reactive behavior
- **Cleanup**: Proper resource disposal and lifecycle management

## File System Abstraction

### Purpose
Provides platform-independent file and directory operations while respecting platform constraints like mobile sandboxing.

### Key Responsibilities
- **Basic Operations**: Read, write, delete files with consistent behavior
- **Directory Management**: Create and navigate directory structures
- **Path Handling**: Abstract platform-specific path conventions
- **File Watching**: Monitor changes with platform-appropriate mechanisms

### Design Considerations
- **Sandboxing**: Mobile platforms restrict file access to app directories
- **Permissions**: Handle platform permission models transparently
- **Performance**: Optimize for platform I/O characteristics
- **Error Handling**: Consistent errors across different file systems

### Platform Differences
- **VS Code**: Direct file system access with full paths and VS Code workspace integration
- **React Native**: Sandboxed storage with platform-appropriate document providers

## Settings Management

### Purpose
Manages application configuration and user preferences across different platform storage mechanisms.

### Key Responsibilities
- **Value Storage**: Store and retrieve typed configuration values
- **Scoping**: Support global, workspace, and document-level settings
- **Persistence**: Ensure settings survive app restarts
- **Migration**: Handle settings schema evolution

### Design Considerations
- **Storage Backend**: Key-value stores, files, or platform APIs
- **Synchronization**: Settings sync across devices (when applicable)
- **Performance**: Cache frequently accessed values
- **Type Safety**: Preserve type information across serialization

### Platform Differences
- **VS Code**: Leverages built-in settings infrastructure with workspace hierarchy
- **React Native**: Uses AsyncStorage with encrypted secure storage for sensitive data

## Spatial UI Abstraction

### Purpose
Provides platform-appropriate spatial UI components for 2D proof tree interaction and visualization.

### Key Responsibilities
- **Spatial Canvas**: 2D proof tree rendering and interaction
- **Input Abstraction**: Mouse, touch, and gesture handling for spatial manipulation
- **Viewport Management**: Pan, zoom, and navigation through proof space
- **Selection Handling**: Spatial selection of proof elements
- **Physical Tree Positioning**: Tree placement in 2D workspace coordinates
- **Spatial Queries**: Point-in-tree testing, nearest element finding
- **Tree Instance Management**: Multiple tree positioning, viewport bounds tracking

### Design Considerations
- **Input Precision**: Mouse precision vs touch approximation
- **Canvas Performance**: Hardware acceleration and rendering optimization
- **Spatial Gestures**: Platform-native spatial interaction patterns
- **Accessibility**: Alternative access to spatial interactions
- **Coordinate Systems**: Logical vs physical coordinates, transformation matrices
- **Rendering Pipeline**: Layer management, clipping, hardware acceleration
- **Memory Management**: Efficient handling of large tree structures

### Interaction Patterns
- **Desktop**: Mouse drag, scroll wheel zoom, keyboard navigation
- **Mobile**: Touch pan, pinch zoom, multi-touch gestures
- **Hybrid**: Adaptive input handling for convertible devices

## Physical Tree Interfaces

### Purpose
Manages the spatial aspects of proof trees as they exist in 2D workspace coordinates, handling tree positioning, viewport management, and spatial relationships between tree instances.

### Key Responsibilities
- **Tree Positioning**: Absolute positioning of tree instances in document workspace
- **Viewport Management**: Pan, zoom, and navigation through spatial proof workspace
- **Spatial Boundaries**: Compute tree bounding boxes, collision detection, spatial queries
- **Multi-Tree Layout**: Coordinate positioning of multiple independent trees
- **Coordinate Transformation**: Convert between logical tree coordinates and physical workspace coordinates

### Design Considerations
- **Coordinate Systems**: Separate logical tree structure from physical positioning
- **Viewport State**: Track current view position, zoom level, visible region
- **Spatial Optimization**: Efficient spatial queries for large numbers of trees
- **Memory Efficiency**: Lazy loading of off-screen tree content
- **Transformation Matrices**: Handle coordinate transformations for zoom/pan operations

### Physical Tree API Categories
- **Positioning APIs**: Set/get tree position, move operations, spatial arrangement
- **Viewport APIs**: Pan, zoom, fit-to-view, viewport bounds management
- **Spatial Query APIs**: Point-in-tree testing, nearest element, overlap detection
- **Layout APIs**: Auto-arrange trees, prevent overlap, spatial optimization
- **Transformation APIs**: Coordinate conversion, matrix operations, spatial math

### Platform Adaptations
- **Desktop**: Precise mouse positioning, scroll wheel zoom, drag operations
- **Mobile**: Touch pan/zoom gestures, spatial touch selection, pinch operations
- **Hybrid**: Adaptive input handling for convertible and touch-enabled desktop devices

## Statement Flow APIs

### Purpose
Manages visualization and interaction with statement flow between atomic arguments in the physical tree structure.

### Key Responsibilities
- **Flow Visualization**: Render connections between statements
- **Flow Interaction**: Handle user interaction with statement flows  
- **Real-time Updates**: Update flow visualization as structure changes
- **Performance Optimization**: Efficient rendering of complex flow networks
- **Dependency Tracking**: Monitor statement dependencies across atomic arguments
- **Flow Path Computation**: Calculate optimal visual paths for statement connections
- **Interactive Flow Navigation**: Click-to-follow, hover highlighting, dependency tracing

### Design Considerations
- **Visual Complexity**: Clear representation of complex flow patterns
- **Interactive Performance**: Smooth interaction with large statement networks
- **Spatial Integration**: Flow visualization integrated with tree layout
- **Platform Rendering**: Leverage platform-specific rendering capabilities
- **Flow State Management**: Track active flows, highlight paths, maintain selection
- **Collision Detection**: Avoid visual interference between flow paths
- **Semantic Flow Types**: Different visual treatments for different dependency types

### Platform Approaches
- **Desktop**: Canvas-based flow rendering with WebGL acceleration
- **Mobile**: Touch-optimized flow interaction with gesture navigation  
- **Accessibility**: Non-visual flow navigation and description

### Flow API Categories
- **Flow Computation APIs**: Dependency analysis, connection discovery, path optimization
- **Flow Visualization APIs**: Arrow rendering, path styling, animation controls
- **Flow Interaction APIs**: Selection handling, navigation commands, follow operations
- **Flow State APIs**: Active flow tracking, highlighting management, viewport synchronization

## LSP Communication

### Purpose
Manages Language Server Protocol communication across different transport mechanisms and platform constraints.

### Key Responsibilities
- **Server Lifecycle**: Start, stop, and monitor language servers
- **Message Exchange**: Send requests and handle responses
- **Document Synchronization**: Keep server and client in sync
- **Custom Extensions**: Support proof-specific LSP extensions

### Design Considerations
- **Transport Flexibility**: Support stdio (desktop), TCP (desktop), WebSocket (desktop), local threads (mobile)
- **Connection Reliability**: Handle disconnections and reconnections (desktop only)
- **Performance**: Minimize latency and bandwidth usage
- **Offline Support**: Complete local processing on all platforms (no remote dependencies)

### Platform Strategies
- **VS Code**: Local process spawning with stdio/pipe communication through VS Code LSP client
- **React Native**: Local LSP execution in separate threads using JSI-based communication

## Command System

### Purpose
Provides a unified way to register and execute commands across different platform interaction models, including spatial commands for proof tree manipulation.

### Key Responsibilities
- **Command Registration**: Define available actions including spatial operations
- **Spatial Command Execution**: Trigger spatial manipulation commands
- **Discovery**: Help users find commands appropriate to their interaction mode
- **Context Sensitivity**: Enable/disable based on spatial and logical state

### Design Considerations
- **Spatial Commands**: Commands that operate on 2D tree positions and layout
- **Invocation Methods**: Keyboard, menu, gesture, spatial manipulation
- **Discoverability**: Context-aware command presentation
- **Customization**: User-defined shortcuts and spatial gestures
- **Undo/Redo**: Integrate spatial changes with command history

### Platform Adaptations
- **Desktop**: Keyboard shortcuts, context menus, spatial mouse operations
- **Mobile**: Touch gestures, spatial touch commands, action sheets
- **Accessibility**: Alternative spatial command invocation methods

## Package Management

### Purpose
Handles installation and management of logic system packages across different distribution mechanisms.

### Key Responsibilities
- **Package Discovery**: Find available packages
- **Installation**: Download and install packages
- **Updates**: Manage package versions
- **Dependencies**: Resolve and install requirements

### Design Considerations
- **Distribution Methods**: Marketplaces, direct downloads, git
- **Security**: Verify package integrity and safety
- **Storage**: Efficient package storage and caching
- **Offline Usage**: Support offline package usage

### Platform Approaches
- **VS Code**: Extension marketplace integration
- **Mobile**: App store policies and restrictions
- **Direct Distribution**: GitHub-based package sharing

## Language System Management

### Purpose
Manages logic system language configurations and their associated language servers.

### Key Responsibilities
- **Language Discovery**: Find available logic systems
- **Configuration**: Manage language-specific settings
- **Server Management**: Handle language server lifecycles
- **Version Control**: Support multiple language versions

### Design Considerations
- **Dynamic Loading**: Hot-swapping languages without restart
- **Compatibility**: Ensure language/document compatibility
- **Resource Management**: Handle multiple active languages
- **Fallbacks**: Graceful handling of missing languages

## Theme Integration

### Purpose
Provides consistent theming across platforms while respecting platform-specific appearance systems.

### Key Responsibilities
- **Theme Application**: Apply color schemes consistently
- **Dynamic Themes**: Support light/dark mode switching
- **Custom Themes**: Allow user-defined themes
- **Platform Integration**: Respect system appearance settings

### Design Considerations
- **Color Systems**: Map abstract colors to platform colors
- **Accessibility**: Ensure sufficient contrast and readability
- **Performance**: Efficient theme switching
- **Consistency**: Maintain visual coherence across platforms

## Implementation Guidelines

### Testing Strategy
Each adapter should be tested at three levels:
1. **Contract Tests**: Verify adapter behavior matches expectations
2. **Integration Tests**: Ensure platform integration works correctly
3. **Mock Implementations**: Provide test doubles for core logic testing

### Error Handling
- **Graceful Degradation**: Features should fail gracefully
- **Clear Error Messages**: Help users understand issues
- **Recovery Options**: Provide ways to recover from errors
- **Logging**: Capture diagnostic information appropriately

### Performance Considerations
- **Lazy Loading**: Initialize only when needed
- **Caching**: Cache expensive operations appropriately
- **Batch Operations**: Group related operations
- **Resource Limits**: Respect platform constraints

## Implementation Benefits

The adapter implementation provides:
- **Code Reuse**: Share core logic across platforms
- **Clean Separation**: Platform code isolated from business logic
- **Implementation Flexibility**: Handle platform differences cleanly
- **Development Focus**: Core team focuses on proof editing, not platform quirks

This implementation approach separates concerns cleanly while maintaining focus on core architectural challenges: statement flows, data persistence, proof structure, and LSP integration.