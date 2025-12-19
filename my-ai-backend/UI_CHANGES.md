# UI Changes for "Zeptej se cokoliv" Feature

## 📝 Text Changes

### HomeScreen Chips
- **OLD:** 🔮 Hlubší
- **NEW:** 🔮 Zeptej se cokoliv

### Main Button
- **OLD:** "Vytáhnout kartu" / "Odhalit večerní tajemství"
- **NEW (when "Zeptej se cokoliv" selected):** "Vyložit karty"

### Question Input Placeholder
- "Na co se chceš zeptat?"
- Or: "Co tě trápí?"

### Submit Button (after typing question)
- "Vyložit karty" ✨

## 🎨 Voice & Tone for UI

Following the style guide:
- ✅ Informal Czech (tykání)
- ✅ Direct, conversational
- ✅ Short (2-4 sentences max)
- ❌ No poetic/flowery language
- ❌ No "vesmír ti posílá" or similar

### Example Flow:
1. Chip: "🔮 Zeptej se cokoliv"
2. Input appears: "Na co se chceš zeptat?"
3. User types: "Mám změnit práci?"
4. Button: "Vyložit karty"
5. Loading: "Karty přemýšlí..."
6. Result: Shows cards + AI answer (following style guide)

## 🔧 Implementation Notes
- AI system prompt updated in `api/chat.js` to match style guide
- Frontend UI components need to be created
- Button text changes when "Zeptej se cokoliv" is selected
