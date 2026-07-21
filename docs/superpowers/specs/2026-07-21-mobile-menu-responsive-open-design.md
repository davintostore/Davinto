# Mobile Menu Responsive Open Design

## Goal

Make the storefront mobile menu feel responsive immediately after a tap while preserving its existing 260 ms slide animation and all other behavior.

## Scope

Change only the mobile menu presentation styles in `client/src/index.css`:

- Keep the existing left-to-right or right-to-left slide direction and duration.
- Show the menu backdrop immediately when the menu opens, matching the cart drawer's immediate visual feedback.
- Use the cart drawer's 260 ms ease-out keyframe entrance mechanism, adapted to the menu's language-aware direction.
- Give the sliding panel a compositor hint so its transform can begin without avoidable layer-promotion work on the first frame.

Do not change the menu component markup, React state, navigation links, focus trap, accessibility attributes, history handling, closing behavior, cart drawer, or other site styling.

## Design

The existing menu remains mounted off-screen. When `data-open` becomes true, it uses a 260 ms ease-out keyframe entrance like the cart drawer. The English menu animates from `translateX(-100%)`, and the Arabic menu animates from `translateX(100%)`. Its existing transform transition remains available for the slide-out state, and the transform receives a narrowly scoped compositor hint.

The backdrop keeps its current hidden and interactive states, but its opacity no longer transitions when `data-open` changes; it becomes visible on the first rendered open state, as the cart backdrop does.

This provides immediate tap feedback without shortening or removing the menu's slide motion.

## Verification

- Run the client production build.
- Confirm the change is limited to the menu CSS and this design document.
- Verify by source inspection that the opening animation uses the cart's 260 ms ease-out timing, English enters from the left, Arabic enters from the right, and the pointer-event behavior and menu component logic remain unchanged.
- If browser automation is available, compare the mobile menu and cart at a phone-sized viewport and confirm both provide immediate backdrop feedback while the menu still slides.
