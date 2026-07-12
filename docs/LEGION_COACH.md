# Legion Coach

## 1. Purpose

Legion Coach is the core decision-support feature of LegionHub.

The player provides the current game state, and the Coach analyzes the available information to recommend the best next action it can determine.

The Coach should not pretend that every game situation has one objectively perfect answer.

When multiple strategies are reasonable, the Coach should:

- Recommend the strongest option.
- Explain why.
- Show an alternative.
- Communicate risk.
- Communicate confidence.

---

## 2. Initial Supported Environment

Initial target:

- Warcraft III: Reforged
- Legion TD Team OZE
- Version 11.4b
- Battle.net Ranked 4v4

Initial modes to research:

- PRCC x3
- PRCC x1
- PHCC

Mode-specific behavior must be verified before being used in recommendations.

---

## 3. Core User Story

> As a Legion TD player, I want to enter my current game situation so that I can quickly understand my strongest next action and why it is recommended.

Example:

> "I am on Wave 6. I have 280 gold, 85 lumber, 6 Wisps, one lumber upgrade and this roll. What should I do?"

The Coach should be able to answer with something like:

> Upgrade Frost Wolf before Wave 7.

And explain:

> Your current army has enough frontline for the next wave, but the upgrade provides more immediate defensive value than another Wisp. Your composition is also vulnerable to the upcoming wave.

---

## 4. Input Model

The Coach input will evolve over time.

### 4.1 Required Inputs

#### Game Version

Example:

- 11.4b

The Coach must know which game data and balance rules apply.

#### Game Mode

Examples:

- PRCC x3
- PRCC x1
- PHCC

#### Current Wave

Example:

- Wave 6

#### Current Gold

Example:

- 280

#### Available Roll

The units currently available to the player.

Example:

- Dragon Aspect
- Wyvern
- Tempest
- Tribesman
- Frost Wolf
- Goblin

---

### 4.2 Recommended Inputs

#### Current Lumber

Example:

- 85

#### Wisp Count

Example:

- 6

Wisps are the lumber-gathering units.

They must not be confused with mercenaries or other units that may be called "workers" by players.

#### Lumber Upgrade Level

Example:

- 1

This represents the player's current lumber-gathering upgrade state.

#### Built Army

Example:

- 2x Frost Wolf
- 1x Tribesman

The Coach needs to understand what the player has already built.

---

### 4.3 Future Inputs

Future versions may include:

- Unit positions
- Incoming mercenaries
- Current income
- King upgrades
- Ally lane state
- Enemy observations
- Team send plan
- Previous leak history
- Current surviving unit HP
- Current team strategy
- Screenshot-assisted input
- Replay-assisted input

These inputs are intentionally excluded from the first implementation unless they become necessary.

---

## 5. Output Model

Every Coach result should be understandable and actionable.

### 5.1 Primary Recommendation

Examples:

- Build Frost Wolf
- Upgrade Frost Wolf
- Buy one Wisp
- Buy one lumber upgrade
- Hold gold
- Reroll
- Save lumber
- Send a mercenary

---

### 5.2 Explanation

Every recommendation must explain why it was suggested.

Bad output:

> Upgrade Frost Wolf.

Better output:

> Upgrade Frost Wolf because your current frontline is likely sufficient, but your composition needs more immediate combat value before the upcoming wave.

The explanation should reference the factors that influenced the recommendation.

---

### 5.3 Alternative Recommendation

When another reasonable strategy exists, the Coach should show it.

Example:

> Alternative: Buy one Wisp if your team expects a low-pressure wave and you are intentionally prioritizing economy.

---

### 5.4 Risk Level

Initial risk categories:

- Low
- Moderate
- High
- Critical

Risk represents the estimated danger of the player's current situation.

It is not a guaranteed leak percentage.

The first version should avoid fake precision such as:

> 83.7% chance to leak

unless the system eventually has enough real data to justify that number.

---

### 5.5 Confidence Level

Initial confidence categories:

- Low
- Medium
- High

Confidence represents how strongly the available data supports the recommendation.

Risk and confidence are different.

Examples:

- High Risk / High Confidence
- High Risk / Low Confidence
- Low Risk / Medium Confidence

---

### 5.6 Upcoming Danger

The Coach should identify important upcoming threats when possible.

Example:

> Upcoming danger: Wave 10 boss.

Or:

> Your current composition may struggle against the next two waves because it lacks verified single-target damage.

---

## 6. Initial Recommendation Types

The first Coach should support recommendation categories such as:

### Build

Build a new unit from the current roll.

### Upgrade

Upgrade an existing unit.

### Economy

Examples:

- Buy a Wisp
- Buy a lumber upgrade

### Hold

Save gold for a stronger purchase or upcoming wave.

### Reroll

Use reroll when the current roll is strategically weak and rerolling is allowed and justified.

### Lumber Strategy

Examples:

- Save lumber
- Spend lumber

### Send

Recommend a mercenary or a save strategy when enough verified information exists.

Send recommendations may require additional game-state information and can be introduced after defensive recommendations are reliable.

---

## 7. Decision Engine

The first version of Legion Coach should not depend on generative AI.

The decision engine should combine:

- Verified game data
- Hard rules
- Unit evaluations
- Synergy evaluations
- Wave matchups
- Economy context
- Risk
- Configurable scoring

---

## 8. Decision Pipeline

The initial conceptual pipeline is:

### Step 1 — Validate Input

Examples:

- Wave must exist.
- Gold cannot be negative.
- Wisp count must be valid for the supported version and mode.
- A unit must exist in the selected game version.

### Step 2 — Normalize Game State

Convert the user's input into a consistent internal representation.

### Step 3 — Analyze Current Army

Evaluate characteristics such as:

- Frontline
- Single-target damage
- Area damage
- Range
- Support
- Scaling
- Current value
- Known weaknesses

### Step 4 — Analyze Upcoming Threat

Evaluate the current and upcoming waves.

### Step 5 — Generate Candidate Actions

Examples:

- Build available unit
- Upgrade existing unit
- Buy Wisp
- Buy lumber upgrade
- Hold gold
- Reroll

Only legal and affordable actions should be generated.

### Step 6 — Score Candidate Actions

Each valid action receives a score based on relevant factors.

### Step 7 — Apply Risk Adjustment

A high-risk game state should prioritize survival more strongly.

A low-risk game state may allow more economy.

### Step 8 — Rank Actions

The highest-scoring valid actions become recommendation candidates.

### Step 9 — Generate Explanation

The system explains which factors caused the selected action to rank highest.

---

## 9. Conceptual Scoring Model

A recommendation may conceptually use factors such as:

- Immediate survival value
- Upcoming-wave value
- Long-term value
- Economy value
- Synergy value
- Flexibility value
- Gold efficiency
- Opportunity cost
- Risk adjustment

Conceptually:

Recommendation Score =

Immediate Survival Value  
+ Upcoming Wave Value  
+ Long-Term Value  
+ Economy Value  
+ Synergy Value  
+ Flexibility Value  
- Opportunity Cost  
+ Risk Adjustment

The exact weights must be configurable.

They must not be permanently hardcoded inside UI components.

---

## 10. Hard Rules

Hard rules prevent impossible or clearly invalid recommendations.

Examples:

- Do not recommend a purchase the player cannot afford.
- Do not recommend an upgrade without the required base unit.
- Do not recommend a unit unavailable in the player's roll.
- Do not recommend an action unavailable in the selected mode.
- Do not recommend invalid Wisp or lumber states.
- Do not use data from the wrong game version.

Hard rules take priority over scoring.

---

## 11. Unit Evaluation

Units may eventually be evaluated across multiple dimensions.

Examples:

- Frontline value
- Single-target damage
- Area damage
- Range
- Support value
- Early-game efficiency
- Mid-game efficiency
- Late-game scaling
- Boss performance
- Group-wave performance
- Gold efficiency
- Upgrade potential

These values must not be invented.

They should come from:

- Verified game data
- Calculations
- Community validation
- Controlled expert evaluation

The source and confidence of important data should be trackable.

---

## 12. Synergy Evaluation

The Coach should eventually understand combinations.

Examples:

- Frontline + ranged damage
- Tank + area damage
- Armor reduction + compatible damage
- Aura interactions
- Crowd control + area damage
- Units that cover each other's weak waves

Synergy should not be represented only as:

> Unit A is good with Unit B.

A more useful model explains why the synergy exists.

---

## 13. Economy Evaluation

The Coach must balance immediate survival against long-term economy.

Possible factors:

- Current Wisp count
- Lumber upgrade level
- Current gold
- Cost of available defensive improvements
- Time until a dangerous wave
- Current defensive margin
- Game mode
- Expected pressure

Example principle:

> If the player is already at high defensive risk, immediate survival should generally receive more weight than economy.

This is a decision principle, not a permanent universal rule.

---

## 14. Explainability

Explainability is a core requirement.

The Coach should be able to answer:

- Why this action?
- Why not the second-best action?
- What problem does this solve?
- What risk remains?
- What information is missing?

Example:

> Recommendation: Upgrade Unit A.

> Why: This provides the highest verified immediate combat value among your affordable options and improves your matchup against the upcoming wave.

> Alternative: Buy one Wisp.

> Why not primary: It improves long-term economy but does not address your current defensive risk.

---

## 15. Uncertainty

The Coach must be honest when it does not have enough information.

Examples:

> Confidence: Low

> Reason: Unit positioning and incoming mercenaries were not provided.

Or:

> No reliable recommendation available because this scenario is not yet supported by verified data.

Returning uncertainty is better than inventing confidence.

---

## 16. Feedback Loop

Future Coach results should allow feedback such as:

- Helpful
- Not helpful
- Recommendation was wrong
- Missing context
- Outdated information

Feedback should help identify:

- Bad rules
- Missing inputs
- Incorrect data
- Unsupported scenarios
- Regression problems

---

## 17. Testing Strategy

Legion Coach is a decision system.

Automated testing is mandatory.

### Unit Tests

Examples:

- Scoring calculations
- Input validation
- Economy calculations
- Candidate generation
- Hard rules

### Scenario Tests

Example:

Given:

- Version: 11.4b
- Mode: PHCC
- Wave: 6
- Gold: X
- Roll: A, B, C, D, E, F
- Built army: Y

Expected:

- Invalid actions are never returned.
- Recommendation belongs to an acceptable set.
- Explanation references relevant decision factors.

### Regression Tests

Known game scenarios should be stored as regression cases.

When rules, weights or game data change, the scenarios should be rerun.

A change that improves one recommendation must not silently break many others.

---

## 18. Alpha Success Criteria

Legion Coach Alpha is successful when:

- Players can enter a supported game state quickly.
- The Coach never recommends impossible actions.
- Recommendations are explainable.
- Supported scenarios are backed by documented data or rules.
- Known uncertainty is communicated.
- Players voluntarily use the Coach again.
- Feedback helps improve future recommendations.

---

## 19. Long-Term Vision

Future versions may support:

- Faster game-state entry
- Saved rolls
- Screenshot-assisted input
- Replay-assisted analysis
- Position-aware recommendations
- Team-level recommendations
- Personalized coaching
- Statistical outcome models
- Natural-language questions
- AI-generated explanations grounded in LegionHub data

The long-term goal is not to replace player skill.

The goal is to help players understand the game and make better decisions.