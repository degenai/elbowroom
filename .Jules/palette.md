## 2026-06-15 - Add aria-current for active links
**Learning:** Custom vanilla JS active-link scripts often miss pairing visual classes with semantic state attributes. In this codebase, the active nav link was styled visually but lacked semantic meaning for screen readers.
**Action:** Whenever adding an 'active' visual state class to a navigation link, immediately ensure that `aria-current="page"` is also applied programmatically.
