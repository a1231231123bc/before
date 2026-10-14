# Before 0.1 — release work

## Implemented in the first slice

- Story creation, editing, categories and search.
- Photo import, native camera integration, dated notes and timeline.
- Durable local storage, schema validation and save-failure recovery.
- Two-photo comparison and PNG export/share integration.
- Confirmation before deleting a photo or story.
- Browser end-to-end tests, domain tests, type checking and CI.

## Before a native beta

- Confirm iOS/Android priority and bundle identifiers.
- Test on physical devices: picker cancellation, denied/limited permissions, camera, HEIC/large images, full storage, process interruption, native PNG sharing, rotation, safe areas and keyboard.
- Test Android back navigation and recovery when Android kills the picker activity.
- Test VoiceOver/TalkBack, large text and reduced motion; refine comparison gestures on touch hardware.
- Add complete journal backup/import before users entrust irreplaceable photo collections to the app.
- Decide whether Russian localization and dark mode are part of 1.0.
- Connect EAS to the owner’s Expo account, then build a simulator or internal preview.
- Review remaining upstream npm advisories and move to compatible patched dependencies.

## Before store submission

- Validate the app name and final identifiers in the target store; availability is not yet checked.
- Publish a privacy policy and support page with the developer’s contact details.
- Complete Apple privacy disclosures / Google Play Data safety based on the final binary and dependencies.
- Create original store screenshots, description, age rating and app icon variants.
- Verify signing, store accounts, tester enrollment and platform-specific review requirements.
- Complete a real-device regression pass and distribute through TestFlight / a Play testing track.
- Submit only after the owner has reviewed the actual build and store listing.

No store build, purchase, or store submission is part of this initial repository setup.
