# Folder Structure

src/ 
├── core/                           # Global singletons & system-wide infrastructure 
│   ├── config/                     # Storage env validation (S3 keys, local upload paths)
│   ├── database/                    
│   ├── exceptions/                  
│   ├── interceptors/                
│   └── core.module.ts              
│ 
├── shared/                         # Reusable utilities & completely generic code 
│   ├── decorators/                 
│   ├── guards/                     
│   ├── pipes/                      
│   └── utils/                      
│ 
├── modules/                        # The core business logic (Feature Modules) 
│   ├── auth/                       
│   ├── users/                      
│   │
│   └── files/                      # File Manager Domain
│       ├── controllers/            # HTTP Layer (Endpoints for Upload/Download/List)
│       │   └── files.controller.ts 
│       ├── services/               # Coordinates business logic & talks to the Adapter
│       │   └── files.service.ts    
│       ├── interfaces/             # Unified Storage interface
│       │   ├── resource.interface.ts          (UnifiedResource)
│       │   └── storage-adapter.interface.ts   (UnifiedStorageAdapter)
│       ├── adapters/               # Concrete implementations of the interface
│       │   ├── local-storage.adapter.ts
│       │   └── database-storage.adapter.ts
│       ├── dto/                    # Validation schemas (e.g., folder creation params)
│       │   ├── create-folder.dto.ts
│       │   └── file-query.dto.ts
│       └── files.module.ts         # Handles dynamic binding of the active driver
│ 
├── app.module.ts                   # Root module
└── main.ts                         # Application entry point