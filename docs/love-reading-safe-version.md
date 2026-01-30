# 🔮 Love Reading Ritual -- Safe Version (Production Ready)

## Goal

Deliver a ritualistic, emotionally engaging love tarot reading with
**minimal risk**, clean architecture, and high UX impact.

This version is designed to be: - Fast to implement (2--3 hours) -
Stable on iOS & Android - Easy to extend later into a Creative version

------------------------------------------------------------------------

## Core Principles

-   Sequential reveal (YOU → PARTNER → RELATIONSHIP)
-   One card at a time (locked progression)
-   Title-first, text-second reveal
-   Clear emotional climax on the third card
-   Frontend renders only (no parsing logic)

------------------------------------------------------------------------

## SAFE VERSION -- REQUIRED FEATURES

### 1. Ritual Opening Screen

**Purpose:** Slow the user down and create intention.

**UX:** - Darkened overlay - Soft heart icon - Short instruction text -
Explicit "Start Reading" button

**Copy suggestion:** \> Focus on your relationship.\
\> Tap a card to reveal its message.

------------------------------------------------------------------------

### 2. Fixed Card Layout

**Order matters.**

    [ YOU ]      [ PARTNER ]

           [ RELATIONSHIP ]

-   YOU: left
-   PARTNER: right
-   RELATIONSHIP: bottom center (visual weight)

------------------------------------------------------------------------

### 3. Sequential Locked Progression

-   Only first card is tappable at start
-   Next card unlocks **2 seconds after** previous flip
-   Locked cards ignore taps completely

This creates anticipation instead of friction.

------------------------------------------------------------------------

### 4. Card Flip Interaction

-   Horizontal flip (classic tarot feel)
-   Spring or easing animation
-   No instant reveals

------------------------------------------------------------------------

### 5. Title-First Meaning Reveal

Reveal order: 1. Section title (YOU / PARTNER / RELATIONSHIP) 2. Short
delay (≈300ms) 3. Meaning text fades in

This frames interpretation before content.

------------------------------------------------------------------------

### 6. Escalating Haptics (iOS)

-   Card 1 → Light
-   Card 2 → Medium
-   Card 3 → Heavy

This subtly communicates emotional weight.

------------------------------------------------------------------------

## SAFE+ UPGRADES (RECOMMENDED ADDITIONS)

These add polish **without significant risk**.

### 7. Breathing Animation (Ready Card Only)

-   Slow scale animation (1 → 1.04)
-   3--4 second cycle
-   Only on the currently tappable card

Purpose: show "this card is waiting for you".

------------------------------------------------------------------------

### 8. Subtle Background Glow Escalation

-   Very gentle glow behind spread
-   Intensity increases after each card
-   Plateaus after third card (clarity, not chaos)

Avoid high contrast or fast changes.

------------------------------------------------------------------------

### 9. Clear Micro-Guidance Text

Small helper text under header: - "Tap the first card" - "Continue with
the second" - "Reveal the final truth"

Keeps users oriented without tutorials.

------------------------------------------------------------------------

## WHAT NOT TO ADD (YET)

Avoid these until after user testing: - Particle explosions - Sound
effects - Complex 3D parallax - Multiple simultaneous animations

Magic comes from restraint.

------------------------------------------------------------------------

## SUCCESS CRITERIA

Before shipping, verify: - Users cannot spam-tap cards - Each reveal
feels intentional - Text never appears before flip completes - Third
card feels heavier than the first two - Flow feels calm, not rushed

------------------------------------------------------------------------

## PHILOSOPHY CHECK

If a user thinks: \> "I experienced a reading, not just got one"

You've succeeded.

------------------------------------------------------------------------

## NEXT STEP (AFTER LAUNCH)

Once validated: - Add particles **only to 3rd card** - Add optional
sound toggle - Add "Save to Journal" feature

Ship Safe. Observe. Then enchant ✨
