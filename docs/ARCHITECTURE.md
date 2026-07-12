# LegionHub Architecture

## 1. Status

**Initial Architecture Proposal**

This document describes the proposed architecture for the LegionHub MVP.

The architecture may evolve as:

- Product requirements become clearer
- Real game data is collected
- Legion Coach requirements are validated
- Usage grows
- Technical constraints are discovered

The goal is to start simple without blocking future evolution.

---

## 2. Architecture Principles

### Keep the MVP Simple

Do not introduce infrastructure before it is necessary.

### Modular Monolith First

The MVP should be developed as one application with clearly separated modules.

We do not initially need microservices.

### Structured Game Data

Game knowledge should be represented as structured data whenever possible.

### Version Awareness

Game balance changes between versions.

The architecture must not assume that a unit always has the same statistics.

### Explainable Decision Logic

Legion Coach recommendations should be traceable to:

- Data
- Rules
- Scores
- Known assumptions

### Business Logic Outside the UI

Important game and Coach logic must not be permanently embedded inside React components.

### Testability

Decision logic must be easy to test independently.

### Low Initial Cost

The MVP should prefer free tiers and open-source tools whenever practical.

---

## 3. Proposed Technology Stack

### Web Application

- Next.js
- React
- TypeScript

### Styling

- Tailwind CSS

A component library may be added later if it provides real value.

### Database

- PostgreSQL

### Initial Database Hosting Candidate

- Supabase

### ORM

To be decided through an Architecture Decision Record.

Initial candidates:

- Prisma
- Drizzle

### Deployment

Initial candidate:

- Vercel

### Source Control

- Git
- GitHub

### CI/CD

Initial candidate:

- GitHub Actions
- Vercel deployment integration

---

## 4. High-Level Architecture

The MVP will begin as a modular monolith.

```text
┌─────────────────────────────┐
│          Browser            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Next.js Application    │
│                             │
│  ┌───────────────────────┐  │
│  │          UI           │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │ Application Services  │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │ Legion Coach Engine   │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │   Data Access Layer   │  │
│  └───────────┬───────────┘  │
└──────────────┼──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
└─────────────────────────────┘