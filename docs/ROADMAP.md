# LegionHub Roadmap

> This roadmap describes product direction, not guaranteed deadlines.

LegionHub will prioritize useful, testable releases over building many features at the same time.

---

## Phase 0 — Foundation

**Status:** In Progress

### Goal

Create a solid foundation before application development begins.

### Deliverables

- [x] Define product mission
- [x] Define target users
- [x] Define initial MVP
- [x] Define Legion Coach concept
- [ ] Define initial architecture
- [ ] Research reliable Team OZE 11.4b data sources
- [ ] Define game-data verification strategy
- [ ] Define initial domain model
- [ ] Create initial product backlog
- [ ] Define repository standards
- [ ] Create initial Architecture Decision Records

### Exit Criteria

Phase 0 is complete when:

- The MVP scope is clear.
- The initial technical architecture is documented.
- We know how the first verified game data will be obtained.
- The first development backlog is ready.
- The first application sprint can begin without major product ambiguity.

---

## Phase 1 — First Public Website

### Goal

Put the first version of LegionHub online.

### Features

- Home page
- Basic navigation
- Responsive layout
- Initial visual identity
- Search interface
- Public deployment
- Basic analytics
- Feedback entry point

### Expected Result

A player can access LegionHub through a public URL and understand:

- What LegionHub is
- What problem it solves
- What is coming next

---

## Phase 2 — Knowledge Base

### Goal

Provide useful, structured Legion TD information.

### Features

#### Units

- Unit data model
- Unit list
- Unit details page
- Base unit and upgrade relationships
- Version-aware statistics
- Strengths and weaknesses
- Data verification status

#### Waves

- Wave data model
- Wave list
- Wave details page
- Attack and armor information
- Strategic notes

#### Mercenaries

- Mercenary data model
- Mercenary list
- Mercenary details

#### Search

Search for:

- Units
- Waves
- Mercenaries

### Expected Result

A player can use LegionHub as a fast reference while learning or playing.

---

## Phase 3 — Legion Coach Alpha

### Goal

Validate whether structured decision support provides real value to players.

### Initial Features

#### Input

- Game version
- Game mode
- Current wave
- Gold
- Lumber
- Wisp count
- Lumber upgrade level
- Available roll
- Built units

#### Output

- Primary recommendation
- Explanation
- Alternative recommendation
- Risk level
- Confidence level
- Upcoming danger

#### Decision Engine

Initial engine components:

- Input validation
- Hard rules
- Candidate action generation
- Unit evaluation
- Wave evaluation
- Synergy evaluation
- Economy context
- Configurable scoring
- Explainable output

### Quality Requirements

- Impossible actions must never be recommended.
- Unsupported scenarios must be identified.
- Low-confidence recommendations must be clearly labeled.
- Important decision logic must have automated tests.

### Expected Result

Real players can test the Coach and tell us whether its recommendations are useful.

---

## Phase 4 — Data Expansion and Coach Improvement

### Goal

Improve coverage, reliability and recommendation quality.

### Features

- More verified unit data
- More wave data
- More mercenary data
- More game modes
- Better synergy modeling
- Better matchup modeling
- More regression scenarios
- User feedback collection
- Recommendation quality review process

### Expected Result

The Coach becomes useful in a larger number of real game situations.

---

## Phase 5 — Competitive Tools

### Goal

Expand LegionHub beyond static reference information.

### Potential Features

#### Combo Finder

The player selects one or more units and receives:

- Strong synergies
- Missing roles
- Possible weaknesses
- Suggested complementary units

#### Build Simulator

The player creates a theoretical army and receives:

- Composition summary
- Role distribution
- Known strengths
- Known weaknesses
- Upcoming dangerous waves

#### Wave Explorer

The player selects a wave and explores:

- Wave characteristics
- Units that perform well
- Units that struggle
- Relevant strategic considerations

### Expected Result

Players use LegionHub not only to search information, but also to plan strategies.

---

## Phase 6 — Replay Intelligence

### Status

Research Required

### Goal

Determine whether Warcraft III replay data can be reliably transformed into useful Legion TD coaching information.

### Potential Features

- Replay upload
- Match metadata extraction
- Build timeline
- Economy timeline
- Wave-by-wave decisions
- Leak timeline
- Decision review
- Post-game coaching report

### Important Constraint

This phase depends on the technical feasibility of:

- Parsing the relevant Warcraft III replay format
- Identifying Legion TD-specific game events
- Reconstructing meaningful player state

We will research feasibility before promising this feature.

---

## Phase 7 — Intelligent Assistant

### Goal

Allow players to interact naturally with LegionHub knowledge.

### Potential Features

- Natural-language questions
- Data-grounded explanations
- Coach conversation
- Replay discussion
- Personalized learning suggestions

Example:

> "I have Dragon Aspect, Wyvern, Tempest, Tribesman, Frost Wolf and Goblin on Wave 6. What should I prioritize?"

The assistant should answer using LegionHub's verified data and decision logic.

### Principle

AI should enhance LegionHub.

LegionHub must not become dependent on AI-generated guesses.

---

## Phase 8 — Community and Ecosystem

### Potential Features

- Community corrections
- Data contribution workflow
- Strategy submissions
- Public API
- Discord bot
- Streamer integrations
- Shareable builds
- Community statistics

These features will only be prioritized if the core product has active users.

---

# Monetization Roadmap

Monetization will not be prioritized before product value is validated.

## Possible Future Models

### Donations and Supporters

Allow community members to support development voluntarily.

### Sponsorships

Relevant partnerships that do not compromise product trust.

### Non-Intrusive Advertising

Only if traffic makes it worthwhile and the user experience remains good.

### Optional Premium Tools

Potential examples:

- Advanced replay reports
- High-cost analysis features
- Additional personalization

Core game reference information should remain broadly accessible.

---

# Product Prioritization Rule

Before adding a feature, ask:

> Does this help a Legion TD player make a better decision?

If the answer is unclear, the feature should not automatically be prioritized.

---

# Current Priority

The current priority is **Phase 0 — Foundation**.

The next critical questions are:

1. Where will verified Team OZE 11.4b game data come from?
2. How will we represent units, upgrades, waves and game versions?
3. How will we distinguish verified data from strategic opinion?
4. What is the smallest useful dataset required for the first public release?
5. What scenarios should Legion Coach support first?