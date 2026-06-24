# MindShift: Product & UX Architecture

Derived directly from the VOLAURA Ecosystem Constitution.

## 1. The 5 Foundation Laws
1. **Never Red:** Red triggers Rejection Sensitive Dysphoria (RSD). 
   - Error states use Purple (`#D4B4FF`).
   - Warning states use Amber (`#E9C400`).
   - Absolute ban on `#FF0000` or `text-red-500`.
2. **Shame-Free Language:** 
   - Ban: "You missed a day", "Failed", "0/10 Complete".
   - Replace with: "I missed you!", "Try a different perspective", "Ready to start?".
3. **Animation Safety:**
   - No infinite loops on action screens.
   - Max 800ms duration for transitions.
   - Zero screen-shaking (vestibular safety).
   - Must respect `prefers-reduced-motion`.
4. **One Primary Action:** 
   - Every screen has exactly ONE gradient/filled CTA button.
   - Max 5 tappable elements per screen (mobile view).
5. **Energy Adaptation:**
   - The UI scales back visual noise if the child signals low energy/focus.

## 2. Cultural UX (Azerbaijan/CIS)
- **Language Register:** Formal "Siz" used for parent-facing UI. Informal "Sən" used strictly by the AI Pet addressing the child.
- **Trust Pattern:** Users must experience the "Aha" moment (entering 3 words for their monster) before any login wall is presented.
- **Button Sizing:** Azerbaijani translations are ~30% longer than English. All CTA buttons must gracefully handle 22+ characters.
