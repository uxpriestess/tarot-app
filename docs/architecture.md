# Tarotka – AI Content Architecture

This document is the single source of truth for how AI-generated content is used inside the Tarotka application.

Its purpose is to enforce clear boundaries between narrative generation and application logic, ensuring the system remains predictable, debuggable, and scalable as complexity grows.

If any implementation decision conflicts with this document, **this document wins**.

---

## Core Principle

**The LLM generates meaning. The application generates structure.**

The AI is treated as a narrative engine, not a logic engine.
All structural responsibility belongs to the codebase.

This separation is intentional and non-negotiable.

---

## Responsibilities by Layer

### 1. LLM (Claude / other models)

The LLM is responsible **only** for producing tarot interpretations in natural language.

It **must**:
- Generate human-readable tarot narrative text
- Follow explicitly provided section markers when requested
- Stay within the semantic scope of the reading

It **must not**:
- Return JSON, YAML, arrays, objects, or key-value structures
- Return code, markup logic, or UI hints
- Decide how many sections exist
- Decide what a section represents

#### Expected Output Shape

When a reading requires multiple perspectives, the LLM returns plain text separated by strict delimiters:

```
--- YOU ---
<text>

--- PARTNER ---
<text>

--- RELATIONSHIP ---
<text>
```

Rules:
- Delimiters must match exactly
- No text before the first delimiter
- No commentary after the final section
- No emojis, formatting symbols, or meta explanations

The LLM is never trusted to be structurally correct — only narratively useful.

---

### 2. Backend

The backend is the **only authority** that turns AI output into structured data.

It is responsible for:
- Defining tarot spread schemas
- Requesting specific narrative sections from the LLM
- Parsing text using known delimiters
- Validating that all required sections exist
- Handling missing, partial, or malformed output
- Mapping sections into application-owned data structures

The backend **never**:
- Assumes the LLM followed instructions perfectly
- Passes raw LLM text directly to the frontend
- Lets AI output define application flow

All AI responses are considered **untrusted input**.

---

### 3. Frontend

The frontend renders data — it does not interpret meaning.

It:
- Receives fully structured data from the backend
- Displays text in predefined UI slots
- Handles empty or missing fields gracefully

It **must not**:
- Parse raw AI text
- Split strings using delimiters
- Make assumptions about tarot logic
- Apply business rules to content

If the frontend needs logic, that logic belongs upstream.

---

## Tarot Reading Logic

- Every tarot spread is defined as a backend schema
- A schema specifies:
  - Number of sections
  - Semantic meaning of each section
  - Display order
  - Whether a section is reflective, predictive, or synthetic

The LLM is informed of this structure **only to guide tone and coherence**, not to define it.

Example:
- The backend decides there is a "Relationship Synthesis" section
- The LLM only provides prose that fits that idea

---

## Error Handling Philosophy

AI output will eventually be wrong.

This system assumes failure is normal and designs for it:
- Missing sections are detected
- Extra sections are ignored
- Invalid responses do not crash the UI
- Users receive a degraded but stable experience

Stability always beats cleverness.

---

## Non-Goals (Explicitly Out of Scope)

The LLM does **not**:
- Control UI layout
- Decide tarot spread composition
- Manage user state
- Define navigation or application flow
- Replace backend validation

If a proposed change blurs these boundaries, stop and re-evaluate.

---

## Usage Rule

When working with AI-assisted code or prompts:

> Follow ARCHITECTURE.md. Do not violate its constraints.

This instruction overrides convenience, speed, and experimentation.

