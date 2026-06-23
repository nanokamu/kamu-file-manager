# folder structure

___

src/
├── components/             # Shared, generic UI components (styled with Tailwind)
│   └── ui/                 # Atomic pieces (Buttons, Modals, Inputs, Tooltips)
│       ├── Button.jsx
│       └── Dropdown.jsx
│
├── context/                # Global state management
│   ├── FileSystemContext.jsx # Tracks the overall file/folder tree structure
│   └── TabContext.jsx        # Tracks which files are currently open, active, and modified
│
├── features/               # Domain-specific logic and UI
│   ├── file-manager/       # Everything related to exploring files
│   │   ├── components/
│   │   │   ├── FileTree.jsx    # Recursive container for rendering files/folders
│   │   │   ├── FileNode.jsx    # Single file or folder row (handles clicks/icons)
│   │   │   └── ContextMenu.jsx # Right-click menu (New File, Delete, Rename)
│   │   └── hooks/
│   │       └── useFileActions.js
│   │
│   └── editor/             # Everything related to viewing/editing files
│       ├── components/
│       │   ├── EditorContainer.jsx # Main view wrapper
│       │   ├── EditorTabs.jsx      # Top bar showcasing currently open file tabs
│       │   └── MonacoWrapper.jsx   # Actual Monaco Editor instance & config
│       └── hooks/
│           └── useMonacoThemes.js  # Custom editor syntax highlighting themes
│
├── utils/                  # Pure utility functions
│   ├── fileHelpers.js      # Map extensions (.js, .md) to Monaco languages & icons
│   └── cn.js               # Tailwind class merging utility (clsx + tailwind-merge)
│
├── App.jsx                 # Master layout (Sidebar / Resizable Split / Editor Grid)
└── main.jsx 

___


src/
├── api/                              # Shared HTTP infrastructure
│   ├── client.ts                     # Base fetch wrapper, error handling, base URL
│   └── types.ts                      # Shared DTOs (e.g. UnifiedResource)
│
├── features/
│   └── file-manager/
│       ├── api/
│       │   └── files.api.ts          # Domain-specific calls to backend_nestjs
│       └── hooks/
│           └── useFileActions.ts     # Components call hooks, not fetch directly


___