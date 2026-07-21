# Mobile Menu Responsive Open Design

## Goal

Make the storefront mobile menu feel responsive immediately after a tap while preserving its existing 260 ms slide animation and all other behavior.

## Scope

Change only the mobile menu presentation styles in `client/src/index.css`:

- Keep the existing left-to-right or right-to-left slide direction and duration.
- Show the menu backdrop immediately when the menu opens, matching the cart drawer's immediate visual feedback.
- Give the sliding panel a compositor hint so its transform can begin without avoidable layer-promotion work on the first frame.

Do not change the menu component markup, React state, navigation links, focus trap, accessibility attributes, history handling, closing behavior, cart drawer, or other site styling.

## Design

The existing menu remains mounted off-screen and continues to transition its `transform` over 260 ms. Its transform receives a narrowly scoped compositor hint. The backdrop keeps its current hidden and interactive states, but its opacity no longer transitions when `data-open` changes; it becomes visible on the first rendered open state, as the cart backdrop does.

This provides immediate tap feedback without shortening or removing the menu's slide motion.

## Verification

- Run the client production build.
- Confirm the change is limited to the menu CSS and this design document.
- Verify by source inspection that the 260 ms slide, language-dependent direction, pointer-event behavior, and menu component logic remain unchanged.
- If browser automation is available, compare the mobile menu and cart at a phone-sized viewport and confirm both provide immediate backdrop feedback while the menu still slides.

