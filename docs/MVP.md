# Minimum Viable Product (MVP)

## 1. Objective

The first version of LegionHub must provide real value to Legion TD players as quickly as possible.

The MVP should validate the following hypothesis:

> Players want fast, structured and actionable Legion TD information and decision support in one place.

The MVP does not need to contain every unit, every game mode or every feature.

It needs to be useful, accurate and easy to use.

---

## 2. MVP Target

Initial game environment:

- Warcraft III: Reforged
- Legion TD Team OZE
- Version 11.4b
- Battle.net Ranked 4v4

Initial game modes to research:

- PRCC x3
- PRCC x1
- PHCC

The differences between game modes must be verified before mode-specific recommendations are implemented.

---

## 3. MVP Core Experience

The MVP will focus on two main experiences:

### Experience A — Find Information

A player can quickly search for game information.

Example:

> Search: Frost Wolf

The player receives structured information about the unit.

### Experience B — Get a Recommendation

A player enters the current game state into Legion Coach.

Example:

- Wave: 7
- Gold: 310
- Lumber: 120
- Wisps: 7
- Lumber upgrades: 1
- Roll: six available units
- Current army: built units

The Coach returns:

- Primary recommendation
- Reason
- Alternative action
- Current risk
- Upcoming danger
- Recommendation confidence

---

## 4. MVP Features

### 4.1 Home Page

The home page should provide immediate access to:

- Search
- Legion Coach
- Units
- Waves

The interface should be simple and fast.

---

### 4.2 Unit Database

Unit pages should eventually support:

- Name
- Game version
- Base unit or upgrade
- Gold cost
- HP
- Damage
- Attack speed
- Attack range
- Attack type
- Armor type
- Abilities
- Role
- Strengths
- Weaknesses
- Synergies
- Dangerous waves
- Notes
- Data verification status

Not every field needs to be available on the first day.

Missing information should be displayed as unknown rather than invented.

---

### 4.3 Wave Database

Wave pages should eventually support:

- Wave number
- Creep name
- Number of creeps
- HP
- Attack type
- Armor type
- Special characteristics
- Common strengths
- Common weaknesses
- Units that perform well
- Units that struggle
- Send considerations

---

### 4.4 Search

Users should be able to search for:

- Units
- Waves
- Mercenaries

Search should eventually support:

- Partial names
- Common aliases
- Common spelling differences

---

### 4.5 Legion Coach Alpha

The first version of Legion Coach will use structured rules, game data and configurable scoring.

#### Initial Inputs

Required:

- Game version
- Game mode
- Current wave
- Current gold
- Available roll

Recommended:

- Current lumber
- Wisp count
- Lumber upgrade level
- Built units

Future inputs may include:

- Unit positioning
- Incoming mercenaries
- Income
- King upgrades
- Ally state
- Enemy observations
- Team send plan

#### Initial Outputs

- Primary recommendation
- Explanation
- Alternative recommendation
- Risk level
- Confidence level
- Upcoming dangerous wave

Possible recommendations include:

- Build a unit
- Upgrade a unit
- Buy a Wisp
- Buy a lumber upgrade
- Hold gold
- Reroll
- Save lumber
- Send a mercenary

---

## 5. MVP Data Strategy

Accuracy is a core requirement.

Before the Coach can become reliable, LegionHub needs verified data for Team OZE 11.4b.

Possible data sources must be researched.

Game information should eventually be classified as:

- Verified
- Calculated
- Community validated
- Experimental
- Unknown

The system must never silently present uncertain information as fact.

---

## 6. Explicitly Out of Scope

The following features are not part of the initial MVP:

- User accounts
- Paid subscriptions
- Social profiles
- Friends system
- Chat
- Native mobile application
- Native Windows application
- Automatic Warcraft III integration
- Live in-game overlay
- Automatic replay parsing
- Machine-learning prediction
- Mandatory paid AI APIs

These features may be considered later.

---

## 7. MVP Validation Questions

After the first public release, we need to learn:

1. What information do players search for most?
2. Do players return to LegionHub?
3. Do players use the Coach during matches?
4. Do players trust the Coach recommendations?
5. Which Coach inputs are missing?
6. Which recommendations are reported as incorrect?
7. Which game modes are used most?
8. Are the database pages or the Coach more valuable?
9. How quickly can a player enter their current game state?
10. Would players recommend LegionHub to another player?

---

## 8. Definition of MVP Success

The MVP is successful if real Legion TD players voluntarily use LegionHub and return because it helps them make better decisions.

The first goal is not revenue.

The first goal is:

> Build something useful enough that players want to use it again.

---

## 9. Definition of Done for the MVP

The MVP can be considered ready for its first public release when:

- The website is publicly accessible.
- The interface works on desktop and mobile.
- Core game data has a defined verification process.
- A useful initial set of units is available.
- A useful initial set of waves is available.
- Search works.
- Legion Coach Alpha can analyze supported scenarios.
- Recommendations include explanations.
- Invalid recommendations are covered by automated tests.
- Known limitations are clearly documented.
- Users can provide feedback.