# 🔒 TAROTKA PERSONALIZATION PLAN - SECURITY & IMPLEMENTATION REVIEW

## Overall Assessment: ⭐⭐⭐⭐ (4/5 Stars)

**Verdict:** Well-structured plan with good sequencing. **Ready to implement with minor security improvements.**

The plan is thoughtful, respects user privacy, and maintains backwards compatibility. Below are security concerns, recommendations, and implementation suggestions.

---

## ✅ WHAT'S EXCELLENT

### 1. **Phased Approach**
- Clear dependencies between phases
- Each phase can be rolled back independently
- Backwards compatibility maintained throughout

### 2. **User Privacy Defaults**
- Gender is **optional** (defaults to neutral)
- No forced personalization
- Graceful degradation for users who skip

### 3. **Data Minimization**
- Only collects what's necessary (name, birthdate, zodiac, gender preference)
- No excessive personal data
- Clear purpose for each field

### 4. **Technical Architecture**
- Zustand + AsyncStorage is appropriate for this use case
- Supabase for optional cloud backup makes sense
- Clear separation of concerns

---

## 🚨 SECURITY CONCERNS & FIXES

### ⚠️ CRITICAL: User Data in API Calls

**Issue:** Phase 1 proposes sending user context (name, zodiac, gender) to backend with every API call.

**Current plan:**
```typescript
// my-ai-backend/api/chat.js
buildUserPrompt(question, cards, mode, moonPhase, userContext?)
// userContext = { name?, zodiacSign?, genderPreference? }
```

**Problems:**
1. **Name in every request = PII over the wire**
2. If backend logging is enabled, names get logged to Vercel/Groq logs
3. GDPR/privacy compliance risk (even with HTTPS)
4. Unnecessary data transmission (name doesn't need to go to AI)

**RECOMMENDED FIX:**

```typescript
// Phase 1: ONLY send what AI actually needs

// ✅ GOOD - Send only what Claude uses
interface UserContext {
  genderPreference?: 'masculine' | 'feminine' | 'neutral';
  zodiacSign?: string; // only if Phase 3 enabled
  // ❌ DON'T send: name, birthDate, email
}

// Name stays client-side only
// AI can refer to user as "ty/tebe" without knowing actual name
```

**Why this is better:**
- Name never leaves device (stored in AsyncStorage only)
- AI doesn't need name to personalize readings
- Reduces PII exposure
- Still allows gender grammar and zodiac mentions

---

### ⚠️ MEDIUM: Birth Date Storage

**Issue:** Birth date is sensitive data (can be used to identify individuals).

**Current plan:**
```typescript
userBirthDate: string | null; // stored in AsyncStorage
```

**Problems:**
1. Full birth date is more than needed (only zodiac sign is used)
2. Stored indefinitely in AsyncStorage
3. Could be exposed if device is compromised

**RECOMMENDED FIX:**

```typescript
// Option A: Don't store birth date at all
// Calculate zodiac during onboarding, then discard date

// Option B: Store only if user explicitly opts in
interface AppStore {
  userName: string | null;
  userZodiacSign: string | null; // ✅ Keep this
  // userBirthDate: REMOVE (not needed after zodiac calculation)
  userGenderPreference: 'masculine' | 'feminine' | 'neutral' | null;
}
```

**Implementation:**
```typescript
// In ZodiacRevealScreen.tsx
const zodiacSign = calculateZodiac(birthDate);
appStore.setUserProfile(name, zodiacSign); // DON'T store birthDate
// Birth date discarded after zodiac calculation
```

**Why this is better:**
- Minimal data retention (privacy by design)
- Zodiac sign is all you need for Phase 3
- Reduces attack surface if device is stolen

---

### ⚠️ MEDIUM: AsyncStorage Encryption

**Issue:** AsyncStorage stores data in **plain text** on device.

**Current state:** User name, zodiac, gender stored unencrypted.

**Risk level:**
- **Low** for name/zodiac (not highly sensitive)
- **Medium** if birth date is stored
- **High** if any payment/auth data is added later

**RECOMMENDED FIX (for future - Phase 5+):**

```bash
# Install expo-secure-store for sensitive data
npx expo install expo-secure-store
```

```typescript
// For highly sensitive data only (NOT name/zodiac)
import * as SecureStore from 'expo-secure-store';

// Example: If you add user tokens or payment info later
await SecureStore.setItemAsync('authToken', token);
```

**For Phase 1-4:** AsyncStorage is **fine** for name/zodiac/gender.
**For Phase 5+:** If storing reading history with emotional content, consider SecureStore.

---

### ⚠️ LOW: Supabase Data Sync

**Issue:** Phase 1 mentions "Supabase data desync" as "not critical."

**Current plan:**
- Onboarding writes to Supabase
- Edits in ProfileScreen only update appStore (NOT Supabase)

**Problems:**
1. Supabase becomes stale after first write
2. If user switches devices, old data is loaded
3. No single source of truth

**RECOMMENDED FIX:**

```typescript
// Option A: Make appStore source of truth (current plan)
// ✅ GOOD for offline-first, single-device use

// Option B: Sync both ways (better for future multi-device)
// ProfileScreen edits also update Supabase
const updateProfile = async (gender: Gender) => {
  appStore.setUserGender(gender); // local
  await supabase
    .from('profiles')
    .update({ gender_preference: gender })
    .eq('id', userId); // also cloud
};
```

**Recommendation for Phase 1:**
- Keep as-is (appStore as source of truth)
- Document: "Supabase is write-once backup, not sync layer"
- Add TODO: "Phase 6 - Multi-device sync via Supabase"

---

## 🎯 IMPLEMENTATION IMPROVEMENTS

### 📝 Improvement 1: Type Safety for Gender

**Current plan:**
```typescript
userGenderPreference: 'masculine' | 'feminine' | 'neutral' | null;
```

**Better:**
```typescript
// src/types/user.ts
export type GenderPreference = 'masculine' | 'feminine' | 'neutral';

// src/store/appStore.ts
interface AppStore {
  userGenderPreference: GenderPreference | null;
}

// Prevents typos like 'male' instead of 'masculine'
```

---

### 📝 Improvement 2: Czech Grammar Inflection - Backend vs Frontend

**Current plan (Phase 2):**
- Backend returns markers like `{adj:připravený}`
- Frontend applies inflection via `applyGender()` utility

**Concerns:**
1. Extra parsing step on client
2. Markers visible if parsing fails
3. Backend needs to remember to add markers

**ALTERNATIVE APPROACH:**

**Option A: Backend does inflection (cleaner)**
```typescript
// Backend receives gender in userContext
buildUserPrompt(question, cards, mode, moonPhase, { genderPreference: 'feminine' })

// System prompt includes:
"If user gender is feminine, use feminine adjective forms directly.
Example: 'Jsi připravená' (not 'jsi připravený')
Never use markers or placeholders."
```

**Pros:**
- No client-side parsing needed
- Cleaner response text
- AI handles grammar naturally

**Cons:**
- Backend must handle Czech grammar (harder for non-Czech speakers to debug)

**Option B: Keep current plan but validate markers**
```typescript
// In applyGender()
if (text.includes('{adj:') && !userGenderPreference) {
  console.error('Gender markers found but no preference set');
  // Fallback: remove markers, show neutral form
}
```

**Recommendation:** Try **Option A** first (backend inflection). If AI struggles with Czech grammar, fall back to marker approach.

---

### 📝 Improvement 3: Zodiac Mention - Rate Limiting

**Current plan (Phase 3):**
- "Mention zodiac ONCE per reading if natural"
- Relies on AI following instructions

**Concern:** AI might mention zodiac too often despite instructions.

**RECOMMENDED FIX:**

```typescript
// In buildSystemPrompt() for Phase 3
if (userContext.zodiacSign) {
  systemPrompt += `
  User's zodiac sign: ${userContext.zodiacSign}
  
  ZODIAC MENTION RULES:
  1. Maximum ONCE per response
  2. Only if card naturally connects (e.g., fire sign + energy card)
  3. Never mention if:
     - Custom question is unrelated to personality
     - Multi-card spread (too cluttered)
     - Reading is about external events (job, travel)
  4. If mentioned, use casual tone: "Jako ${zodiacSign}, možná..."
  `;
}

// Add server-side validation
if (response.includes(userContext.zodiacSign)) {
  const mentions = (response.match(new RegExp(userContext.zodiacSign, 'gi')) || []).length;
  if (mentions > 1) {
    console.warn(`Zodiac mentioned ${mentions} times, should be max 1`);
    // Consider regenerating or stripping extra mentions
  }
}
```

---

### 📝 Improvement 4: Week Spread - Token Budget

**Current plan (Phase 4a):**
- 7 days × 80-100 words = 560-700 words
- "Each day references previous developments"

**Concern:** This requires AI to hold 7 cards + narrative arc in context.

**Token estimate:**
- System prompt: ~800 tokens
- 7 cards with meanings: ~300 tokens
- Generated response: ~700-1000 tokens
- **Total: ~2000-2100 tokens per week spread**

**With Groq llama-3.3-70b:**
- Max tokens: Usually set to 500-1000 in your current setup
- Week spread needs **higher limit**

**RECOMMENDED FIX:**

```javascript
// In my-ai-backend/api/chat.js
const maxTokens = mode === 'week_progressive' ? 1200 : 500;

const completion = await groq.chat.completions.create({
  // ...
  max_tokens: maxTokens,
  // ...
});
```

**Also add cost warning:**
- Week spreads are 2-3× more expensive than daily cards
- Consider rate limiting (max 1 week spread per day per user)

---

## 🔐 SECURITY CHECKLIST

### Phase 1: User Data Persistence
- [x] Don't send name to backend (use only on client)
- [x] Don't store birth date after zodiac calculation
- [x] Use AsyncStorage for name/zodiac (acceptable for this data)
- [x] Make gender preference optional
- [x] Validate data types (TypeScript enums for gender)

### Phase 2: Czech Grammar
- [ ] Consider backend inflection instead of markers
- [x] Fallback to neutral if parsing fails
- [x] Test with edge cases (missing markers)

### Phase 3: Zodiac Integration
- [x] Server-side validation (max 1 mention)
- [x] Only send zodiac if user opted in
- [x] Clear opt-out mechanism in ProfileScreen

### Phase 4: Week Spread
- [x] Increase max_tokens for week mode
- [ ] Add rate limiting (max 1/day to control costs)
- [x] Validate response length before returning

### Phase 5: Response Storage
- [ ] Consider SecureStore if responses contain emotional content
- [x] Add data retention policy (e.g., auto-delete after 90 days)
- [ ] GDPR compliance: Add "export my data" and "delete my data" options

---

## 🚀 RECOMMENDED IMPLEMENTATION ORDER

### **Phase 1a: Foundation (Secure Version)**
**Time: 4-6 hours**

```typescript
// src/store/appStore.ts
interface AppStore {
  userName: string | null; // CLIENT-SIDE ONLY
  userZodiacSign: string | null; // can go to backend
  userGenderPreference: GenderPreference | null; // can go to backend
  // ❌ REMOVED: userBirthDate (calculated and discarded)
}

// src/services/universe.ts
export async function askUniverse(question: string, card: Card) {
  const userContext = {
    gender: appStore.getState().userGenderPreference,
    zodiac: appStore.getState().userZodiacSign,
    // ❌ NOT INCLUDED: userName (stays on device)
  };
  
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ question, card, userContext })
  });
}
```

**Testing:**
- Console.log userContext in backend - verify name is NOT present
- Check Vercel logs - name should NEVER appear
- Test with gender = null (neutral users)

---

### **Phase 1b: Profile UI**
**Time: 2 hours**

Add ProfileScreen with:
- Name (read-only, from appStore)
- Zodiac sign (read-only)
- Gender toggle (editable → updates appStore + re-renders)
- "Upravit profil" button to edit name (updates appStore only, not Supabase)

---

### **Phase 2: Czech Grammar (Backend Approach)**
**Time: 3-4 hours**

Try having backend do inflection directly:

```javascript
// my-ai-backend/api/chat.js
const systemPrompt = `
${basePrompt}

USER GENDER: ${userContext.gender || 'neutral'}

CZECH GRAMMAR RULES:
If gender is 'feminine', use feminine adjective endings (-á, -í).
If gender is 'masculine', use masculine endings (-ý, -í).
If gender is 'neutral' or not set, use neutral forms (-é, -í) or avoid gendered language.

Example:
- Feminine: "Jsi připravená na nový den."
- Masculine: "Jsi připravený na nový den."
- Neutral: "Den je před tebou." (avoid gendered forms)

NEVER use markers like {adj:word}. Apply grammar naturally.
`;
```

**If this doesn't work well:** Fall back to marker approach from original plan.

---

### **Phase 3: Zodiac (With Validation)**
**Time: 2-3 hours**

```javascript
// Add to system prompt
if (userContext.zodiac) {
  systemPrompt += `
  User's zodiac: ${userContext.zodiac}
  Mention ONCE if naturally relevant. Never force.
  `;
}

// After response
const zodiacMentions = (response.match(new RegExp(userContext.zodiac, 'gi')) || []).length;
if (zodiacMentions > 1) {
  // Strip extra mentions or log warning
  console.warn('Too many zodiac mentions:', zodiacMentions);
}
```

---

### **Phase 4a: Week Spread**
**Time: 3-4 hours**

```javascript
// Increase token budget
const maxTokens = mode === 'week_progressive' ? 1200 : 500;

// Add rate limiting
const lastWeekSpread = await getLastWeekSpreadTime(userId);
if (Date.now() - lastWeekSpread < 24 * 60 * 60 * 1000) {
  throw new Error('Max 1 week spread per day');
}
```

---

### **Phase 5: Storage (With Retention Policy)**
**Time: 2-3 hours**

```typescript
interface JournalEntry {
  id: string;
  date: string;
  cards: Card[];
  aiResponse: string;
  mode: ReadingMode;
  expiresAt: string; // NEW: auto-delete after 90 days
}

// Cleanup old entries on app start
useEffect(() => {
  const now = new Date();
  appStore.cleanupExpiredEntries(now);
}, []);
```

---

## 💡 ADDITIONAL RECOMMENDATIONS

### 1. **Add Privacy Policy**

**File: `src/screens/PrivacyScreen.tsx`**

Users should know:
- What data is collected (name, zodiac, gender)
- Where it's stored (device only vs. Supabase)
- What goes to AI (gender + zodiac, NOT name)
- How long it's kept (90 days for readings)
- How to delete (ProfileScreen → Delete Account)

---

### 2. **Add Data Export**

GDPR compliance (even if not required, it's good practice):

```typescript
// ProfileScreen.tsx
const exportMyData = async () => {
  const data = {
    profile: {
      name: appStore.userName,
      zodiac: appStore.userZodiacSign,
      gender: appStore.userGenderPreference,
    },
    journal: appStore.journalEntries,
  };
  
  const json = JSON.stringify(data, null, 2);
  // Share as file or copy to clipboard
  await Sharing.shareAsync({
    mimeType: 'application/json',
    data: json,
    dialogTitle: 'Export My Data'
  });
};
```

---

### 3. **Add Data Deletion**

```typescript
// ProfileScreen.tsx
const deleteMyData = async () => {
  Alert.alert(
    'Smazat všechna data?',
    'Tato akce je nevratná.',
    [
      { text: 'Zrušit', style: 'cancel' },
      { 
        text: 'Smazat', 
        style: 'destructive',
        onPress: () => {
          appStore.clearAllData();
          navigation.navigate('Onboarding');
        }
      }
    ]
  );
};
```

---

## 🎯 FINAL VERDICT

**The plan is GOOD with these adjustments:**

### ✅ Ready to implement:
- Phase 1 (with security fixes above)
- Phase 2 (try backend inflection first)
- Phase 3 (with mention validation)

### ⚠️ Implement with caution:
- Phase 4a (increase token budget, add rate limiting)
- Phase 5 (add data retention policy)

### 🔒 Security score: **8/10**
- With fixes: **9.5/10**

### 📈 Privacy score: **7/10**
- With privacy policy + data export: **9/10**

---

## 🚦 GO / NO-GO DECISION

**GO** ✅ — This plan is solid and well-thought-out.

**Required changes before implementation:**
1. ✅ **CRITICAL:** Don't send name to backend (Phase 1)
2. ✅ **CRITICAL:** Don't store birth date after zodiac calculation (Phase 1)
3. ⚠️ **HIGH:** Add zodiac mention validation (Phase 3)
4. ⚠️ **MEDIUM:** Increase token budget for week spread (Phase 4a)
5. 💡 **NICE-TO-HAVE:** Add privacy policy screen
6. 💡 **NICE-TO-HAVE:** Add data export/deletion

**With these fixes, the plan is ready for implementation!** 🎉

---

**Questions?** Let me know if you want detailed code diffs for any phase!
