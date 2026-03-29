# Safety On Speed Landing Page Brief

Last updated: 2026-03-28

## Goal

Collect the product, brand, content, technical, and asset details needed to build a credible landing page for **Safety On Speed (SOS)** without inventing unsupported claims.

This brief is based on:

- the current app codebase
- the README and setup docs
- the current public site at `https://safetyonspeed.lk/` fetched on 2026-03-28

## 1. Product Truth Snapshot

### Confirmed product identity

- Product name: **Safety On Speed**
- Short form used in the repo: **SOS**
- App type: **mobile-first personal safety app** built with Expo / React Native
- Current web mode: **static Expo web output**
- Core promise: **help the user act fast in an emergency, alert trusted contacts, share live location, and access nearby emergency support**

### Confirmed geography and market bias

- The product is clearly **Sri Lanka-first**
- Emergency numbers are Sri Lankan:
  - `119` police/emergency
  - `1990` ambulance
  - `110` fire and rescue
  - `1938` Women & Child Bureau
- Default map center is Sri Lanka
- Guardian phone validation is optimized for Sri Lankan numbers beginning with `94`
- Profile location options use Sri Lankan districts

### Confirmed audience

The code supports these audiences with high confidence:

- individual users who want a fast SOS flow
- people who rely on trusted guardians or family contacts
- users who need nearby hospitals, police stations, and pharmacies
- multilingual Sri Lankan users

The code does **not** clearly prove a narrower marketing persona like:

- only women
- only students
- only commuters
- only parents

Those can still be the target audience, but that would need a product decision, not a code assumption.

## 2. Confirmed Features We Can Safely Market

### SOS actions

- **Quick SOS**: one tap triggers a quick SOS flow
- **Emergency SOS**: three taps inside a short window trigger emergency mode
- Emergency tap window: `1200ms`
- Emergency mode pushes the user toward a direct `119` call

### Live location and sharing

- SOS creates a live session with a share token
- Public live-tracking route exists at `/sos/[token]`
- Live location updates continue until the user stops SOS
- Tracking is intended to continue when the phone is locked if permissions are granted
- SOS stores first and latest coordinates plus update timestamps

### Guardian alerts

- Users can add **up to 5 guardians**
- If verified guardians exist, the app prefers them over unverified contacts
- Guardian alerts can be sent automatically through **WhatsApp**
- There is a documented **Twilio SMS** path
- If automation fails, the app supports a manual fallback path

### Nearby help and safety map

- Nearby emergency support uses Google Places
- The app supports nearby:
  - hospitals
  - police stations
  - pharmacies
- Emergency Services screen includes hotline calling plus map actions
- Map supports:
  - place search
  - autocomplete
  - place details
  - ratings and review summaries
  - open-now filtering
  - wheelchair-accessible filtering
  - photos

### Heatmaps and incident context

- The product includes a heatmap concept
- The app aggregates SOS or incident data into map overlays
- The README positions this as a Sri Lanka safety heatmap

### Community features

- The app has a community/news feed
- Users can create posts and browse posts
- This is a forum-like safety discussion feature

### User profile and preferences

- Dark mode is supported
- Language switching is supported
- User can manage:
  - push notifications
  - alert notifications
  - personal data access
  - camera access
  - live location access

### Language support

- English
- Sinhala
- Tamil

## 3. Marketing Claims That Need Verification Before Reusing

The current public site contains claims that are not fully backed by the current app code.

### Legacy claims that look risky

- **Lock Screen Widget**
  - Mentioned on the public site
  - Not found in the current app codebase

- **Safety Ratings**
  - The app has Google place ratings and a safety heatmap
  - It does not clearly show a proprietary location safety score

- **Alerts through SMS, phone calls, or push notifications**
  - WhatsApp automation is confirmed
  - Twilio SMS is documented
  - Direct `119` calling is confirmed
  - Push notification preferences exist, but a complete push-alert marketing story is not clearly surfaced in the current code

- **Shelters / safe spaces**
  - Police stations, hospitals, pharmacies, and hotlines are confirmed
  - “Shelters” are not clearly supported in the current app

- **Anonymized incident details shown on the map**
  - Incident/heatmap infrastructure exists
  - A polished incident-details UI is not clearly confirmed from the code inspected

### Website details that need cleanup

- The Features subtitle on the public site is still lorem ipsum
- The Register button on the public site does not show a real destination
- Social icons on the public site appear to use placeholder `#` links

## 4. Brand Direction Already Present In The Product

### Brand personality implied by the app

- urgent but calm
- trustworthy
- practical
- local and useful
- safety-first, not flashy

### Confirmed colors already used

- Deep navy background: `#002747`
- Dark card blue: `#1A3B54`
- Auth background navy: `#041C32`
- Light surface: `#F0F0F0`
- White: `#FFFFFF`
- Black: `#000000`
- Emergency red: `#E53935`
- Darker alert red: `#C62828`
- Bright cyan accent: `#0494CB`
- Auth cyan accent: `#74D7FF`
- Auth primary blue: `#1B7ED5`

### Existing typography clues

- The public site uses **Nunito**
- The app itself mainly uses native/system fonts

Recommendation:

- If the landing page should feel connected to the public site, keep **Nunito**
- If it should feel connected to the app UI, prioritize the app colors and safety-first hierarchy over the older website look

### Existing visual motifs

- circular emergency button
- dark navy backgrounds
- cyan accents for trust and action
- bright red for emergency actions
- rounded cards
- map imagery
- location pulse / pin treatments

## 5. Existing Content Inventory

### Strong content already available

- product name and purpose
- core feature list
- onboarding language
- team member names
- support email
- support phone number
- Sri Lankan emergency hotline numbers
- multilingual support story

### Confirmed contact details

- Email: `grsacn2025@gmail.com`
- Phone: `+94 74 341 7006`
- Location: `IIT (Informatics Institute of Technology), Sri Lanka`

### Confirmed team members

- Gagana Perera
- Chamethya Yasodie
- Nimsara Karunaratne
- Shenal Arosha
- Amaya Pitawela
- Rivindu Sanjula

### Useful copy angles already present in the app

- “One tap starts a Quick SOS”
- “Three fast taps starts the emergency flow”
- “Add up to 5 contacts”
- “live location”
- “nearby emergency services”
- “personal safety”

## 6. Asset Inventory

### Assets already in the repo

- Logo: `assets/oc/logo.png`
  - `138x136`
- Background image: `assets/oc/bgImage.png`
  - `138x136`
- Default image: `assets/oc/default-img.png`
  - `600x600`
- Icons:
  - menu
  - home
  - forum
  - person
  - pharmacy
  - hospital
  - police

### Important asset gap

The repo does **not** contain a strong marketing screenshot library.

That means a polished landing page still needs:

- app screenshots
- device mockups
- a hero composite
- an Open Graph image
- favicon / export set if the existing logo is too low resolution

### Screenshots worth creating

- Home screen with SOS button
- SOS loading flow
- SOS active/live map screen
- Emergency Services screen
- Map with nearby places
- Heatmap view
- Guardians setup screen
- Community/news screen
- Profile language/settings screen

## 7. What The Landing Page Must Communicate

### Mandatory story points

- what Safety On Speed is
- who it helps
- what happens during Quick SOS
- what happens during Emergency SOS
- how guardians are notified
- that live location sharing exists
- that nearby emergency help is built in
- that the product is localized for Sri Lanka
- that the app supports English, Sinhala, and Tamil
- how privacy/permissions are handled

### Best trust signals available today

- Sri Lanka-specific emergency integrations and numbers
- multilingual support
- live-tracking architecture
- trusted guardian system
- real team names
- direct contact information

### Trust signals not available yet

- user testimonials
- press mentions
- partner logos
- store ratings
- install counts
- case studies

## 8. Recommended Landing Page Structure

### 1. Hero

Must include:

- a clear safety headline
- one-line explanation
- primary CTA
- secondary CTA
- app visual or screenshot

Recommended primary CTA options:

- `Create account`
- `Get started`
- `Open the app`

Recommended secondary CTA options:

- `See how SOS works`
- `View features`

Hero message should focus on:

- immediate emergency response
- trusted guardian alerts
- live location sharing

### 2. How SOS Works

Must show the core flow in plain language:

1. Tap once for Quick SOS
2. Tap three times for Emergency SOS
3. Guardians receive a live tracking link
4. User can call `119` and stop SOS when safe

### 3. Feature Grid

Recommended cards:

- Quick SOS
- Emergency SOS
- Live location sharing
- Trusted guardians
- Emergency hotlines
- Nearby hospitals and police
- Safety heatmap
- Community safety feed

### 4. Sri Lanka Safety Support Section

Use this section to localize the experience:

- `119`
- `1990`
- `110`
- `1938`
- Sri Lanka map context
- language support

### 5. Guardians + Live Tracking Section

Must explain:

- up to 5 guardians
- verified contacts are prioritized
- live link keeps updating until SOS stops
- WhatsApp automation exists

### 6. Map + Nearby Help Section

Must explain:

- nearest hospitals and police stations
- searchable map
- heatmap / incident awareness
- place details and ratings

### 7. Privacy + Control Section

Must explain:

- location is requested because SOS and nearby safety features need it
- live location can be controlled in settings
- personal data sharing is asked explicitly during onboarding
- alert preferences exist

### 8. Team / Credibility Section

Use:

- team members
- IIT reference
- direct contact info

### 9. FAQ

Suggested FAQ topics:

- Does SOS contact emergency services automatically?
- How many guardians can I add?
- Does live tracking stop automatically?
- Do I need location permissions?
- Which languages are supported?
- Is this built for Sri Lanka?

### 10. Footer

Must include:

- contact details
- social links once real URLs exist
- privacy policy
- terms of use
- copyright

## 9. CTA And Conversion Decisions Still Needed

The landing page cannot be fully finished until these decisions are made.

### Product CTA decision

Decide whether the primary action is:

- mobile app sign-up
- web sign-up
- demo request
- waitlist
- download / install

### Destination decision

Possible destinations based on the current app:

- `/auth/sign-up`
- `/auth/login`
- a future app-store link
- a future APK/TestFlight link

### Audience decision

Decide whether the page is for:

- general consumers
- women’s safety specifically
- students and young adults
- institutions / partners
- all of the above

## 10. Technical Constraints For Implementation

### Current route behavior

- `app/index.tsx` currently redirects to `/(tabs)`
- unauthenticated users entering the tab flow are redirected to `/auth/login`
- there is no real marketing landing page route yet

### Implication

If the landing page is built inside this app, the root routing behavior must change.

Most likely options:

- show landing page on web and keep current native behavior
- show landing page for logged-out users and app shell for signed-in users
- move the app shell behind a dedicated `/app` or similar route

### Public route that must remain accessible

- `/sos/[token]`

This route is part of the live SOS sharing experience and should not be broken by a landing-page rewrite.

### Platform constraints

- Expo web output is static
- web maps use iframe-based Google Maps embedding
- native maps use `react-native-maps`

### Environment variables relevant to marketing/demo flows

- `EXPO_PUBLIC_GOOGLE_API_KEY`
- `EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL`
- `EXPO_PUBLIC_SOS_CONFERENCE_WEBHOOK_URL`
- `EXPO_PUBLIC_SOS_BASE_URL`
- Supabase URL and key

### Implementation caution

Any landing page that promises live demos, maps, or public preview flows should account for:

- auth state
- environment-variable availability
- public SOS share routes
- web-vs-native behavior differences

## 11. Content And Legal Gaps Still Missing

These are not blockers for a rough first version, but they are blockers for a polished public launch.

- privacy policy
- terms of use
- real social media URLs
- app-store or download URLs
- high-resolution brand kit
- screenshots / device mockups
- approved hero headline
- approved subheadline
- testimonial or proof section
- analytics or usage stats
- FAQ answers approved by the product owner
- any medical/legal disclaimer if needed

## 12. Recommended Messaging Direction

### Safe headline territory

- “Personal safety support when seconds matter.”
- “Trigger SOS fast, alert your guardians, and share your live location.”
- “A Sri Lanka-first safety app for emergencies, nearby help, and trusted contacts.”

### Safe subheadline territory

- “Safety On Speed helps you send a quick SOS, start an emergency flow, share live location, and reach nearby help from one app.”

### Messaging to avoid until verified

- “lock screen widget”
- “AI safety scoring”
- “automatic emergency dispatch”
- “shelter discovery”
- “nationwide incident database” as a hard claim

## 13. Verification Notes

### Public site snapshot checked on 2026-03-28

Observed sections:

- About SOS
- Features
- Team
- Contact

Observed issues:

- placeholder copy still present
- missing real social links
- possible mismatch with current app capabilities

### Code-level validation

Confirmed through code and tests:

- SOS tap logic exists
- guardian message generation exists
- emergency hotlines exist
- multilingual support exists

### Test run notes

The following targeted tests were run on 2026-03-28 with Watchman disabled:

- `__tests__/guardian-alerts.test.ts`
- `__tests__/extra.emergency-services.test.tsx`
- `__tests__/sos-tap.test.ts`

Results:

- `guardian-alerts` passed
- `sos-tap` passed
- `extra.emergency-services` failed because the current route behavior pushes to `/map` with a timestamp param, while the test still expects `/(tabs)/map`

That failure does not block landing-page planning, but it does show there is at least one stale test expectation in the repo.

## 14. Build Checklist

Use this checklist before starting design or implementation.

- confirm the primary audience
- confirm the main CTA
- confirm whether the page is web-only or cross-platform
- decide whether to preserve the old public-site structure
- create product screenshots
- create or export a high-resolution logo
- approve final feature claims
- supply privacy policy and terms
- supply social/profile URLs
- decide whether to show the team section
- decide whether to surface contact phone and email publicly

## 15. Best Next Step

The fastest path is:

1. use this brief as the source of truth
2. choose the primary CTA and audience
3. capture 4 to 6 app screenshots
4. build a web landing page at the root route
5. keep `/sos/[token]` public and untouched

## Evidence Sources

- `README.md`
- `app.config.js`
- `app/index.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/extra.tsx`
- `app/(tabs)/news.tsx`
- `app/(tabs)/profile.tsx`
- `app/auth/*.tsx`
- `components/auth/AuthLayout.tsx`
- `components/sos/SOSActiveScreen.tsx`
- `components/tabs/MapScreen.native.tsx`
- `components/tabs/MapScreen.tsx`
- `components/theme/ThemeContext.tsx`
- `styles/global.ts`
- `lib/i18n.ts`
- `lib/sosService.ts`
- `lib/guardianPhone.ts`
- `hooks/notifyVerifiedGuardians.ts`
- `docs/twilio-sos-setup.md`
- `docs/whatsapp-sos-setup.md`
- `db_schema.sql`
- `https://safetyonspeed.lk/`
