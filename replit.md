# E Deviser - OBE Mastery Hub

## Overview

E Deviser is an Outcome-Based Education (OBE) management system designed to track and manage learning outcomes across educational institutions. The platform provides role-based access for administrators, coordinators, teachers, and students to create, map, and track Institutional Learning Outcomes (ILO), Program Learning Outcomes (PLO), and Course Learning Outcomes (CLO). The system includes comprehensive gamification features, visual outcome mapping, evidence collection through student submissions, and analytics dashboards for educational assessment and accreditation purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected route implementation
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation for type-safe form schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with role-based access control (RBAC)
- **Validation**: Shared Zod schemas between client and server

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless deployment
- **ORM**: Drizzle ORM with type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling with WebSocket support

### Authentication and Authorization
- **Authentication Method**: Session-based with encrypted passwords using scrypt
- **Role-Based Access Control**: Four distinct roles (admin, coordinator, teacher, student)
- **Permission Structure**: Hierarchical permissions with primary and secondary ownership concepts
- **Session Management**: Server-side sessions with PostgreSQL store for persistence

### Core Business Logic
- **Outcome Hierarchy**: Three-tier learning outcome structure (ILO → PLO → CLO)
- **Bloom's Taxonomy Integration**: Six cognitive levels mapped to learning outcomes
- **Visual Outcome Mapping**: Interactive canvas for mapping outcome relationships
- **Evidence Collection**: Automated evidence aggregation through student submissions
- **Gamification System**: XP points, levels, badges, and streak tracking for student engagement
- **Analytics Engine**: Performance tracking and institutional reporting capabilities

### Role-Based Permissions
- **Admin**: Manages ILOs, can override PLOs, system-wide access
- **Coordinator**: Manages PLOs within assigned programs, can override CLOs
- **Teacher**: Manages CLOs within assigned courses, creates assignments and rubrics
- **Student**: Submits assignments, tracks personal progress and achievements

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time database connections via ws library

### Authentication & Session Management
- **Passport.js**: Authentication middleware with local strategy
- **Connect-PG-Simple**: PostgreSQL session store for Express sessions
- **Crypto**: Node.js built-in module for password hashing with scrypt

### UI Component Libraries
- **Radix UI**: Headless UI components for accessibility and functionality
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for component variant management
- **Tailwind CSS**: Utility-first CSS framework with custom design system

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **ESBuild**: JavaScript bundler for production builds
- **TypeScript**: Type-safe development with shared schemas
- **Replit Plugins**: Development environment integration for runtime errors and debugging

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation library
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### Date and Utility Libraries
- **Date-fns**: Date utility library for formatting and manipulation
- **Nanoid**: URL-safe unique string ID generator
- **CLSX & Tailwind Merge**: Utility for conditional CSS class management