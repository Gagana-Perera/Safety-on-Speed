# Safety on Speed (SOS) Project Evidence Document

This document is based only on implementation evidence visible in the repository at the time of inspection. Where the codebase, SQL files, generated types, and setup documents do not match, that inconsistency is stated explicitly instead of being resolved by assumption. This revision reflects the current working tree visible during inspection, including uncommitted implementation changes.

## 1. PROJECT OVERVIEW

Safety on Speed (SOS) is an Expo/React Native mobile application with Supabase as the backend service layer. Based on the visible implementation, the app combines personal safety functions, SOS live-location sharing, guardian contact management, emergency service discovery, profile management, a community/news feed, and an incident reporting flow.

The main problem the app appears to address is fast access to help during unsafe situations. The codebase shows three main safety goals:

- Let a signed-in user trigger an SOS quickly from the home screen.
- Share the user’s live or repeatedly updated location during an SOS session.
- Help the user contact guardians or emergency services nearby.

The intended users appear to be individual end users who want a personal safety app rather than an institutional admin system. There is no visible admin dashboard, role-based admin module, or staff-facing backend panel in the repository.

The overall purpose of the system, based on actual code, is to give the user a mobile safety dashboard where they can:

- create an account and maintain a profile,
- add up to five guardian contacts,
- trigger a quick or emergency SOS,
- keep an SOS session active with ongoing location updates,
- share a public SOS link,
- attempt automated guardian alert delivery through a Supabase Edge Function for WhatsApp,
- find hotlines and nearby police stations, hospitals, and pharmacies,
- manage app preferences such as language, notifications, and live-location permission,
- create and read news/community posts,
- submit a post-incident report.

Main modules/features visibly present in the project:

- Authentication and onboarding
- Guardian/emergency contact setup
- SOS session creation and live tracking
- Public SOS share page
- WhatsApp-based guardian alert integration
- Emergency services and nearby places
- Map search and nearby place details
- Profile and privacy/preferences management
- News/community posts
- Incident reporting
- Heatmap prototype

## 2. IMPLEMENTED FEATURES

### 2.1 Authentication and Session Gating

- Feature name: Email/password authentication and session-based routing
- What it does: Allows users to sign in with Supabase Auth and redirects unauthenticated users away from the protected tab layout.
- How it works at a practical level: `app/auth/login.tsx` collects email and password and calls `loginUser()` from `lib/auth.ts`, which uses `supabase.auth.signInWithPassword()`. `app/(tabs)/_layout.tsx` checks `supabase.auth.getSession()` and redirects to `/auth/login` if there is no session.
- Main files involved:
  - `app/auth/login.tsx`
  - `lib/auth.ts`
  - `app/(tabs)/_layout.tsx`
  - `app/session.tsx`
  - `lib/superbase.ts`
- Status: Fully implemented for basic sign-in and protected routing.

### 2.2 Multi-step Signup with Email OTP Verification

- Feature name: Multi-screen signup and OTP verification
- What it does: Collects user profile basics, password, and email in separate screens, then verifies the email using a one-time code before creating/updating the profile row.
- How it works at a practical level: signup data is temporarily stored in memory via `lib/signup-draft.ts`. The flow is `sign-up.tsx` -> `sign-up-password.tsx` -> `sign-up-email.tsx` -> `otp.tsx`. `app/auth/otp.tsx` sends an email OTP with `supabase.auth.signInWithOtp()`, verifies it with `supabase.auth.verifyOtp()`, sets the password via `supabase.auth.updateUser()`, and upserts a row into `profiles`.
- Main files involved:
  - `app/auth/sign-up.tsx`
  - `app/auth/sign-up-password.tsx`
  - `app/auth/sign-up-email.tsx`
  - `app/auth/otp.tsx`
  - `lib/signup-draft.ts`
- Status: Implemented, but with important caveats:
  - signup draft data is only stored in module memory, not persistent storage,
  - guardian phone verification is discussed in comments but not implemented,
  - the OTP UI is simplified compared with the comments/design notes in the file.

### 2.3 Forgot Password and Change Password

- Feature name: Password reset and password change
- What it does: Allows a user to reset a forgotten password through email OTP and change the password while signed in.
- How it works at a practical level: `app/auth/forgot-password.tsx` sends an OTP with `signInWithOtp`, verifies it with `verifyOtp`, updates the password with `updateUser`, then signs the user out. `app/auth/change-password.tsx` directly calls `supabase.auth.updateUser()` for a signed-in user.
- Main files involved:
  - `app/auth/forgot-password.tsx`
  - `app/auth/change-password.tsx`
  - `lib/superbase.ts`
- Status: Fully implemented at UI/service level.

### 2.4 Guardian / Emergency Contact Management

- Feature name: Add and manage guardians
- What it does: Lets a user store up to five guardian contacts that are later used by the SOS flow.
- How it works at a practical level: the app writes one flattened `guardians` row per user with columns `g1_name`, `g1_phone`, through `g5_name`, `g5_phone`. `saveGuardians()` first tries `insert`, then falls back to `update` on duplicate-key error. Contacts are also cached in AsyncStorage so they can still be displayed if remote select fails.
- Main files involved:
  - `app/auth/addguardians.tsx`
  - `app/auth/editguardians.tsx`
  - `lib/saveguardians.ts`
  - `lib/editguardians.ts`
  - `hooks/notifyVerifiedGuardians.ts`
  - `db_schema.sql`
- Status: Implemented for create/read/update of guardian slots. Delete is only partial:
  - individual contacts can be removed from the local UI array and then overwritten with nulls on save,
  - there is no visible explicit row delete call from the app.

### 2.5 Guardian Verification Preference Logic

- Feature name: Verified guardian preference logic
- What it does: Prefers verified guardians if any exist, otherwise falls back to all guardians.
- How it works at a practical level: `extractGuardianRecipients()` reads `g1_verified` to `g5_verified` and returns verified recipients first if present.
- Main files involved:
  - `hooks/notifyVerifiedGuardians.ts`
  - `db_schema.sql`
- Status: Partially implemented. The database fields and selection logic exist, but no UI or workflow that actually verifies guardian phone numbers is visible in the codebase.

### 2.6 Home Dashboard and SOS Trigger Recognition

- Feature name: Home dashboard with quick and emergency SOS gestures
- What it does: Provides the main SOS trigger. One tap starts Quick SOS after a delay; three taps inside the configured time window start Emergency SOS.
- How it works at a practical level: `app/(tabs)/index.tsx` tracks tap timestamps and uses the timing constants from `lib/sosTap.ts`. It also shows guardian count, GPS status, internet status, and the location pre-permission modal.
- Main files involved:
  - `app/(tabs)/index.tsx`
  - `lib/sosTap.ts`
  - `hooks/notifyVerifiedGuardians.ts`
  - `hooks/useInternetStatus.ts`
- Status: Fully implemented.

### 2.7 Location Permission Pre-prompt

- Feature name: In-app location pre-prompt
- What it does: Displays a custom permission explainer before the OS location permission request.
- How it works at a practical level: `app/(tabs)/index.tsx` uses AsyncStorage keys such as `location_preprompt_choice_v3` and `location_preprompt_pending_v1` to decide when to show the modal and what previous choice the user made.
- Main files involved:
  - `app/(tabs)/index.tsx`
  - `__tests__/home.location-preprompt.test.tsx`
- Status: Implemented.

### 2.8 SOS Session Creation and Live Tracking

- Feature name: SOS session management
- What it does: Creates an SOS session in Supabase, stores the first and latest coordinates, maintains active session state, and keeps app-local state for recovery.
- How it works at a practical level: `startSOS()` in `lib/sosService.ts` checks the authenticated user, live-location preference, and guardians. It creates a `sos_sessions` row, captures the best available location using a balanced-accuracy first GPS read, stores the first/last coordinates, inserts a `sos_locations` history point, and saves a local `active_sos_session_v1` snapshot in AsyncStorage. After guardian alert state is written back, it updates the cached local session directly instead of re-reading the row.
- Main files involved:
  - `lib/sosService.ts`
  - `lib/sosLiveTracking.ts`
  - `lib/sosTask.ts`
  - `db_schema.sql`
  - `docs/sos-live-tracking.sql`
- Status: Fully implemented for session creation, updates, and stop state.

### 2.9 Background Location Updates During SOS

- Feature name: Background SOS location tracking
- What it does: Continues writing location updates while an SOS session is active.
- How it works at a practical level:
  - On native mobile, `startLocationTracking()` starts `expo-location` background updates using `SOS_LOCATION_TASK_NAME`.
  - `lib/sosTask.ts` defines the task with `expo-task-manager` and writes each location to `sos_sessions` and `sos_locations`.
  - On web, it falls back to `watchPositionAsync`.
- Main files involved:
  - `lib/sosService.ts`
  - `lib/sosTask.ts`
  - `app.config.js`
- Status: Implemented.

### 2.10 Active SOS Screen

- Feature name: Active SOS monitoring screen
- What it does: Shows the active alert, last update, guardian count, alert delivery state, and stop/call/share actions.
- How it works at a practical level:
  - `app/sos/active.tsx` routes to the platform-specific screen.
  - `components/sos/SOSActiveScreen.native.tsx` subscribes to realtime changes on `sos_sessions`, displays a `react-native-maps` preview, optionally auto-calls 119, and allows stop/share/manual guardian alert actions.
  - `components/sos/SOSActiveScreen.tsx` is the web implementation using an embedded Google Maps iframe.
- Main files involved:
  - `app/sos/active.tsx`
  - `components/sos/SOSActiveScreen.native.tsx`
  - `components/sos/SOSActiveScreen.tsx`
  - `lib/sosService.ts`
- Status: Fully implemented.

### 2.11 SOS Share Link Page

- Feature name: Public SOS share page
- What it does: Exposes the active SOS session by share token and shows the latest coordinates to anyone with the link while the session remains active.
- How it works at a practical level:
  - `buildSOSShareUrl()` creates `/sos/<token>` based URLs.
  - `components/sos/SOSShareScreen.native.tsx` and `components/sos/SOSShareScreen.tsx` poll the session by share token.
  - If the viewer is also the owner, the native screen can keep pushing updated coordinates through `updateLocation()`.
- Main files involved:
  - `app/sos/[token].tsx`
  - `components/sos/SOSShareScreen.native.tsx`
  - `components/sos/SOSShareScreen.tsx`
  - `lib/sosLiveTracking.ts`
  - `lib/sosService.ts`
- Status: Implemented.

### 2.12 Emergency Call Trigger

- Feature name: 119 emergency call integration
- What it does: Opens the phone dialer for emergency number 119.
- How it works at a practical level: `triggerCall119()` in `lib/sosService.ts` opens `telprompt:119` on iOS or `tel:119` elsewhere. Emergency SOS routes pass `autoCall=1`, and the active SOS screen triggers the call after a short delay.
- Main files involved:
  - `lib/sosService.ts`
  - `app/sos/loading.tsx`
  - `components/sos/SOSActiveScreen.native.tsx`
  - `components/sos/SOSActiveScreen.tsx`
- Status: Implemented.

### 2.13 Automated Guardian Alert Delivery

- Feature name: Automated WhatsApp guardian alert
- What it does: Attempts to send WhatsApp alerts to guardians when SOS starts.
- How it works at a practical level:
  - `dispatchGuardianAlert()` in `hooks/notifyVerifiedGuardians.ts` receives guardians, sender name, and coordinates from `startSOS()`, builds the human-readable SOS message for UI/fallback use, and directly calls `sendSOSWhatsAppAlert()` without refreshing the session or fetching GPS again.
  - `sendSOSWhatsAppAlert()` invokes the Supabase Edge Function `sos-whatsapp-alert`.
  - The edge function sends a template message through the Meta WhatsApp Cloud API.
- Main files involved:
  - `hooks/notifyVerifiedGuardians.ts`
  - `services/sendSOSWhatsAppAlert.ts`
  - `supabase/functions/sos-whatsapp-alert/index.ts`
- Status: Partially implemented. The sending pipeline exists, but several evidence-based caveats apply:
  - the function sends a Google Maps coordinate link, not the `/sos/<token>` live-share URL,
  - the function code does not validate or load the active SOS session from Supabase even though the docs say it does,
  - the docs and function environment variable names do not match,
  - the app still contains older Twilio-based services/docs that are no longer the active path.

### 2.14 Manual WhatsApp / Share-Sheet Fallback

- Feature name: Manual guardian alert fallback
- What it does: Opens a WhatsApp deep link or the device share sheet if automated alert delivery fails.
- How it works at a practical level: if `dispatchGuardianAlert()` throws, it returns `method: "manual-whatsapp"` and `status: "pending"`. The active SOS screen then shows an `Alert Guardians` button, which uses `openPendingGuardianAlert()` and `openGuardianAlertComposer()` to open WhatsApp or the share sheet with the prebuilt SOS message.
- Main files involved:
  - `hooks/notifyVerifiedGuardians.ts`
  - `lib/sosService.ts`
  - `components/sos/SOSActiveScreen.native.tsx`
  - `components/sos/SOSActiveScreen.tsx`
- Status: Implemented.

### 2.15 Nearby Emergency Hotlines

- Feature name: Static emergency hotline cards
- What it does: Lets the user directly dial emergency numbers such as 119, 1990, 110, and 1938.
- How it works at a practical level: `app/(tabs)/extra.tsx` renders hotline cards from the `SERVICES` array. Tapping `Call` opens a `tel:` or `telprompt:` link.
- Main files involved:
  - `app/(tabs)/extra.tsx`
  - `__tests__/extra.emergency-services.test.tsx`
  - `test-evidence/functional-test-plan.md`
- Status: Fully implemented.

### 2.16 Nearby Services / Google Places Search

- Feature name: Nearby hospital, police station, and pharmacy discovery
- What it does: Uses Google Places APIs to find nearby emergency-related places and either call them or open them in the app’s map screen.
- How it works at a practical level:
  - `app/(tabs)/extra.tsx` asks for the user’s GPS location and uses `getNearbyPlaces()` and `getPlaceMobileNumber()` from `services/GooglePlacesService.ts`.
  - The service layer contains selection heuristics such as preferring non-specialty hospitals and filtering police results to real police stations.
- Main files involved:
  - `app/(tabs)/extra.tsx`
  - `services/GooglePlacesService.ts`
  - `services/GooglePlacesService.test.ts`
  - `__tests__/extra.emergency-services.test.tsx`
- Status: Implemented.

### 2.17 Map Search, Nearby Place Details, and Directions Launching

- Feature name: Interactive map and place detail browsing
- What it does: Shows the user’s location, lets the user search for places, open selected place details, browse nearby POIs, open Google Maps directions, and view a heatmap overlay.
- How it works at a practical level:
  - `components/tabs/MapScreen.native.tsx` is a large stateful screen using `react-native-maps`.
  - It uses `autocompletePlaces()`, `searchNearbyPlaces()`, `getPlaceDetails()`, and `findNearestPlaceAt()` from `services/GooglePlacesService.ts`.
  - It stores search history in AsyncStorage and can route from the Extra screen into the Map screen with a `placeId` or POI category.
  - The web version `components/tabs/MapScreen.tsx` uses a Google Maps iframe instead of `react-native-maps`.
- Main files involved:
  - `app/(tabs)/map.tsx`
  - `components/tabs/MapScreen.native.tsx`
  - `components/tabs/MapScreen.tsx`
  - `services/GooglePlacesService.ts`
- Status: Implemented, with a few partial/incomplete areas:
  - voice search logic exists in the native map file but is not wired into the visible UI and explicitly says mobile voice search requires a rebuild,
  - the heatmap overlay uses dummy data rather than backend data.

### 2.18 Profile Management and Preferences

- Feature name: Profile viewing, editing, and preferences
- What it does: Lets the user view/edit name, phone, email, location, avatar, theme, language, notification preferences, privacy preferences, and live-location access setting.
- How it works at a practical level:
  - `app/(tabs)/profile.tsx` loads merged profile data from Supabase Auth metadata and the `profiles` table through `getMergedProfileData()`.
  - `app/editProfile.tsx` updates personal details and uploads avatar images to the Supabase `avatars` storage bucket.
  - `profile.tsx` updates settings directly in the `profiles` table.
- Main files involved:
  - `app/(tabs)/profile.tsx`
  - `app/editProfile.tsx`
  - `lib/profileService.ts`
  - `lib/i18n.ts`
- Status: Implemented, but deployment/schema evidence for some profile columns and the `avatars` bucket is incomplete in the visible SQL files.

### 2.19 Theme and Localization

- Feature name: Light/dark theme and multilingual UI
- What it does: Allows switching theme and changing app language between English, Sinhala, and Tamil.
- How it works at a practical level:
  - `components/theme/ThemeContext.tsx` stores theme preference in AsyncStorage or localStorage.
  - `lib/i18n.ts` defines translation resources and initializes `i18next`.
  - `profile.tsx` updates the profile’s `language` field and calls `i18n.changeLanguage()`.
- Main files involved:
  - `components/theme/ThemeContext.tsx`
  - `lib/i18n.ts`
  - `app/(tabs)/profile.tsx`
- Status: Implemented in the app UI. Database-schema support for the `language` column is not visible in `db_schema.sql`.

### 2.20 Push Token Registration

- Feature name: Push token capture
- What it does: Requests notification permission and stores an Expo push token against the profile row.
- How it works at a practical level: `app/_layout.tsx` requests notification permissions at app start and calls `Notifications.getExpoPushTokenAsync()`, then writes `push_token` into the `profiles` table.
- Main files involved:
  - `app/_layout.tsx`
- Status: Partially implemented. Token registration exists, but there is no visible backend logic that sends push notifications, and `push_token` is not defined in the visible SQL schema.

### 2.21 News / Community Posts

- Feature name: News feed and post creation
- What it does: Reads posts from a `posts` table and allows creating new posts from a modal.
- How it works at a practical level:
  - `app/(tabs)/news.tsx` loads posts with `fetchPosts()` and renders them.
  - `app/createpost.tsx` creates a new post with title/body/date/time and optional local image URI.
  - `lib/newsApi.ts` uses a separate Supabase client for the `posts` table.
- Main files involved:
  - `app/(tabs)/news.tsx`
  - `app/createpost.tsx`
  - `app/global.ts`
  - `lib/newsApi.ts`
- Status: Partially implemented. Read/create are present, but several issues are visible:
  - no `posts` table definition is visible in `db_schema.sql` or `database.types.ts`,
  - media rendering in `news.tsx` is commented out,
  - update/delete functionality is only commented out in `lib/newsApi.ts`.

### 2.22 Incident Reporting

- Feature name: Incident report flow
- What it does: Walks the user through incident verification, incident type, safety check, and resolution advice, then saves a report to Supabase.
- How it works at a practical level: `app/report.tsx` is a step-based modal flow. On completion, it calls `saveReport()` from `lib/report.ts`, which inserts into the `reports` table.
- Main files involved:
  - `app/report.tsx`
  - `lib/report.ts`
  - `database.types.ts`
- Status: Partially implemented. The reporting UI and insert function exist, but:
  - no `reports` table DDL is visible in `db_schema.sql`,
  - the unsafe-case emergency button in the Resolution step has no action,
  - the screen text refers to calling `911`, which does not match the Sri Lankan emergency-number handling used elsewhere.

### 2.23 Heatmap Prototype

- Feature name: SOS heatmap visualisation
- What it does: Displays a location heatmap based on grouped SOS alert points.
- How it works at a practical level:
  - `services/sosHeatmap.ts` contains dummy SOS alert data and aggregation logic.
  - `components/tabs/HeatmapScreen.native.tsx` draws circles on a map using the aggregated data.
  - `components/tabs/HeatmapScreen.tsx` is a simpler web fallback screen.
- Main files involved:
  - `services/sosHeatmap.ts`
  - `components/tabs/HeatmapScreen.native.tsx`
  - `components/tabs/HeatmapScreen.tsx`
  - `__tests__/sosHeatmap.test.ts`
- Status: Partially implemented prototype. The visualisation exists, but it is not connected to live database data.

### 2.24 Legacy / Planned SOS Integrations Still Present in Code

- Feature name: Legacy Twilio/SMS/conference services
- What it does: Older service files and docs describe SMS alerting and Twilio conference calls.
- How it works at a practical level:
  - `services/sendSOS.ts`, `services/sendSOSAlert.ts`, and `services/startSOSConference.ts` call webhook URLs from env vars.
  - `docs/twilio-sos-setup.md` describes `sos-twilio-alert` and `sos-twilio-conference`.
  - `hooks/notifyVerifiedGuardians.ts` still contains an older `notifyVerifiedGuardians()` function that invokes a missing `send-sos-sms` function.
- Main files involved:
  - `services/sendSOS.ts`
  - `services/sendSOSAlert.ts`
  - `services/startSOSConference.ts`
  - `hooks/notifyVerifiedGuardians.ts`
  - `docs/twilio-sos-setup.md`
- Status: Planned/legacy, not part of the currently wired SOS flow. There is no corresponding Twilio edge function in `supabase/functions/`.

## 3. CHAPTER 1 EVIDENCE – IMPLEMENTATION

### 3.1 Chapter 1 Summary Notes

The Implementation chapter should highlight that this is a mobile-first Expo/React Native safety application built around Supabase services. The strongest visible implementation areas are:

- authentication and onboarding,
- guardian contact management,
- SOS creation and live location updates,
- public SOS share links,
- nearby emergency service discovery using GPS and Google Places,
- profile/preferences management.

The chapter should also clearly acknowledge the mixed maturity level of the project. Some modules are production-like and end-to-end, while others are prototype or partial:

- SOS core flow is substantially implemented.
- Nearby places and map features are heavily implemented.
- Heatmap uses dummy data.
- News and reports are only partially supported by visible backend/schema evidence.
- Legacy Twilio documentation and services remain in the repo even though the active server-side function is WhatsApp-based.

### 3.2 Prototype Overview

The implemented prototype is a multi-screen mobile safety application with the following visible user journey:

1. A user creates an account using a multi-step signup flow and email OTP verification.
2. The user adds guardian contacts.
3. From the home screen, the user can trigger Quick SOS with one tap or Emergency SOS with three rapid taps.
4. The app creates an SOS session in Supabase, captures location, and starts updating it over time.
5. The app attempts to notify guardians through a WhatsApp edge function. If that fails, the active SOS screen can open a manual WhatsApp/share flow.
6. The user or guardian can open a share-token page to view the current SOS location.
7. Outside the SOS flow, the user can access emergency hotlines, nearby police/hospital/pharmacy information, a searchable map, a profile/settings area, a news feed, and a report form.

This is not just a static UI prototype. There is actual service-layer logic for:

- Supabase Auth
- database writes and reads
- location permissions and tracking
- Supabase Realtime subscription for the active SOS screen
- Google Places lookups
- Meta WhatsApp API messaging through a serverless function

### 3.3 Technology Selections

#### React Native

- What it is: Cross-platform mobile UI framework.
- Where it is used: All app screens and components under `app/`, `components/`, and hooks/stateful logic.
- Why it seems to have been chosen: The project is explicitly a mobile application and uses device capabilities such as GPS, calling, camera/image picking, and notifications.
- Benefit to the project: Enables one codebase for iOS, Android, and a limited web version.

#### Expo

- What it is: React Native platform/tooling ecosystem.
- Where it is used: `package.json`, `app.config.js`, `app.json`, Expo plugins, `expo-router`, Expo packages such as `expo-location`, `expo-notifications`, `expo-image-picker`, `expo-task-manager`.
- Why it seems to have been chosen: The repo follows standard Expo project structure and commands.
- Benefit to the project: Simplifies mobile development, native permission handling, static web export, and cross-platform builds.

#### Expo Router

- What it is: File-based routing/navigation for Expo/React Native.
- Where it is used: `app/` folder structure, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, route files such as `app/auth/login.tsx`, `app/sos/loading.tsx`, `app/sos/[token].tsx`.
- Why it seems to have been chosen: The repo is organized around route files rather than explicit navigator definitions for each screen.
- Benefit to the project: Clear route structure and direct mapping from folders to screens.

#### TypeScript

- What it is: Typed superset of JavaScript.
- Where it is used: Nearly all frontend and service files are `.ts` or `.tsx`.
- Why it seems to have been chosen: The project uses typed services, typed database helpers, and typed React props/state.
- Benefit to the project: Improves maintainability and reduces common runtime mistakes.

#### Supabase

- What it is: Backend-as-a-Service providing Auth, Postgres, Realtime, Storage, and Edge Functions.
- Where it is used:
  - Auth: `lib/auth.ts`, `app/auth/*`, `app/session.tsx`
  - Database: `lib/sosService.ts`, `lib/saveguardians.ts`, `lib/profileService.ts`, `lib/report.ts`, `lib/newsApi.ts`
  - Realtime: `lib/sosService.ts`
  - Storage: `app/editProfile.tsx`
  - Edge Functions: `services/sendSOSWhatsAppAlert.ts`, `supabase/functions/sos-whatsapp-alert/index.ts`
- Why it seems to have been chosen: The app relies on quick full-stack features without a separate custom backend project.
- Benefit to the project: Centralizes authentication, relational data, realtime updates, serverless logic, and storage.

#### PostgreSQL via Supabase

- What it is: Relational database used through Supabase.
- Where it is used: visible tables in `db_schema.sql` and `database.types.ts`, including `profiles`, `guardians`, `sos_sessions`, `sos_locations`, `live_locations`, and `reports`.
- Why it seems to have been chosen: Structured relational entities fit users, guardians, SOS sessions, and reports.
- Benefit to the project: Supports strong data relationships and row-level security policies.

#### Supabase Auth

- What it is: Managed authentication service.
- Where it is used: login, signup, OTP verification, password reset, session checks.
- Why it seems to have been chosen: It integrates directly with Supabase database user IDs and the mobile app.
- Benefit to the project: Simplifies user account management and access control.

#### Supabase Edge Functions with Deno

- What it is: Serverless functions running on Supabase Edge Runtime.
- Where it is used: `supabase/functions/sos-whatsapp-alert/index.ts`.
- Why it seems to have been chosen: The Meta WhatsApp token should not be kept in the mobile app.
- Benefit to the project: Keeps messaging credentials server-side and allows outbound API calls to Meta.

#### Supabase Realtime

- What it is: Realtime Postgres change subscriptions.
- Where it is used: `subscribeToSOSSessionById()` and `subscribeToSOSSessionByShareToken()` in `lib/sosService.ts`.
- Why it seems to have been chosen: Active SOS status and location need frequent updates.
- Benefit to the project: Lets the active SOS screen react to live session changes without repeated manual refresh.

#### Supabase Storage

- What it is: File storage service.
- Where it is used: avatar upload flow in `app/editProfile.tsx`, bucket name `avatars`.
- Why it seems to have been chosen: User profile photos need upload and public URL generation.
- Benefit to the project: Avoids building separate file-upload infrastructure.

#### Expo Location and Expo Task Manager

- What they are: Device geolocation API and background task registration.
- Where they are used: `lib/sosService.ts`, `lib/sosTask.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/extra.tsx`, `components/tabs/MapScreen.native.tsx`.
- Why they seem to have been chosen: The app depends heavily on current and ongoing location data.
- Benefit to the project: Supports GPS access, reverse geocoding, foreground/background updates, and live SOS tracking.

#### React Native Maps

- What it is: Native map component for iOS/Android.
- Where it is used: `components/tabs/MapScreen.native.tsx`, `components/sos/SOSActiveScreen.native.tsx`, `components/sos/SOSShareScreen.native.tsx`, `components/tabs/HeatmapScreen.native.tsx`.
- Why it seems to have been chosen: The app needs interactive native maps and marker/circle overlays.
- Benefit to the project: Enables an in-app map instead of only external map links.

#### Google Maps / Places / Directions APIs

- What they are: External APIs for place search, autocomplete, place details, and routing.
- Where they are used: `services/GooglePlacesService.ts`, `components/tabs/MapScreen.native.tsx`, `app/(tabs)/extra.tsx`, `app.config.js`.
- Why they seem to have been chosen: The project needs nearby emergency-related place discovery and map-friendly place detail data.
- Benefit to the project: Allows dynamic discovery of nearby hospitals, police stations, pharmacies, and route launching.

#### NativeWind / Tailwind CSS

- What they are: Utility-first styling tools for React Native.
- Where they are used: `tailwind.config.js`, `metro.config.js`, `babel.config.js`, `app/global.css`, `app/_layout.tsx`, and many screens using `className`.
- Why they seem to have been chosen: Many UI files mix Tailwind-style utility classes with `StyleSheet`.
- Benefit to the project: Speeds up consistent styling across screens, with `app/global.css` acting as the root Tailwind stylesheet imported by the Expo Router layout.

#### i18next / react-i18next

- What they are: Localization libraries.
- Where they are used: `lib/i18n.ts`, `app/(tabs)/profile.tsx`, `app/(tabs)/index.tsx`.
- Why they seem to have been chosen: The project includes English, Sinhala, and Tamil translations.
- Benefit to the project: Supports a multilingual user interface appropriate for the project’s likely target region.

#### AsyncStorage

- What it is: Local persistent storage for React Native.
- Where it is used:
  - session/auth storage in `lib/superbase.ts`
  - guardian cache in `lib/saveguardians.ts`
  - SOS active session cache in `lib/sosService.ts`
  - map search history in `components/tabs/MapScreen.native.tsx`
  - location pre-prompt decisions in `app/(tabs)/index.tsx` and `app/(tabs)/extra.tsx`
- Why it seems to have been chosen: Several app states need local persistence across app restarts.
- Benefit to the project: Improves resilience and UX even when backend reads fail.

#### Expo Notifications

- What it is: Notification permission/token API.
- Where it is used: `app/_layout.tsx`.
- Why it seems to have been chosen: The profile includes notification preferences and the app collects a push token.
- Benefit to the project: Provides the groundwork for push notifications.

#### Expo Image Picker

- What it is: Media selection and camera permission API.
- Where it is used: `app/editProfile.tsx`, `app/createpost.tsx`, `app/_layout.tsx`, `app/(tabs)/profile.tsx`.
- Why it seems to have been chosen: The app supports avatar upload and planned image attachment in posts.
- Benefit to the project: Simplifies media selection from the mobile device.

#### Jest and React Native Testing Library

- What they are: Unit/component testing tools.
- Where they are used: `jest.config.js`, `jest.setup.ts`, `__tests__/`, `services/GooglePlacesService.test.ts`.
- Why they seem to have been chosen: The repo contains automated tests for logic-heavy and UI-heavy flows.
- Benefit to the project: Supports regression checking for key behaviours.

#### ESLint

- What it is: Static analysis / linting tool.
- Where it is used: `eslint.config.js`, `package.json`.
- Why it seems to have been chosen: Standard quality tooling for Expo/TypeScript projects.
- Benefit to the project: Identifies hook issues, unused imports, and unresolved paths.

#### Docker / Docker Compose

- What they are: Containerization and local development orchestration tools.
- Where they are used: `Dockerfile`, `docker-compose.yml`.
- Why they seem to have been chosen: To run Expo development in a containerized environment.
- Benefit to the project: Provides a reproducible local dev environment, especially for `expo start --tunnel`.

#### Git / GitHub

- What they are: Version control and remote collaboration tools.
- Where they are used: `.git` history, branch names, merge commit messages.
- Why they seem to have been chosen: Standard team collaboration workflow.
- Benefit to the project: Supports multi-developer feature branching and merge-based collaboration.

Version-control clues actually visible:

- Branch names: `main`, `gagana`, `nimsara`, and remote branches such as `origin/amaya`, `origin/chamethya`, `origin/rivindu`, `origin/shenal`, `origin/EmergencyContacts-Chamethya`.
- Merge evidence: recent history includes `Merge pull request #72`, `#71`, `#70`, `#69`, `#68`.
- Commit prefixes are partly conventional: examples include `fix:`, `perf:`, and `style:`.

Technologies/dependencies that are present but not clearly implemented in the visible code:

- `@hcaptcha/react-native-hcaptcha` and `HCAPTCHA_SITE_KEY` exist in dependencies/env, but no actual hCaptcha usage is visible.
- `maplibre-gl` is installed but not used in visible app code.
- `react-native-immediate-phone-call`, `@react-native-voice/voice`, and `expo-speech-recognition` are installed, but the visible map voice-search flow is not fully wired into the UI and explicitly says mobile voice search requires a rebuild.

### 3.4 Backend Implementation Evidence

The backend architecture is mostly Backend-as-a-Service rather than a custom API server. There is no Express, NestJS, Django, Laravel, or custom REST controller layer in the repository. Instead, the backend is split across:

- Supabase Auth
- Supabase Postgres tables
- Supabase Realtime subscriptions
- Supabase Storage
- one Supabase Edge Function
- client-side service code that acts as the app’s business logic layer

Visible backend structure:

- `supabase/config.toml` -> Supabase local project configuration
- `supabase/functions/sos-whatsapp-alert/index.ts` -> serverless WhatsApp alert sender
- `db_schema.sql` -> main visible SQL schema file
- `docs/sos-live-tracking.sql` -> additional SOS schema documentation
- `database.types.ts` -> generated or hand-maintained Supabase database typings

How backend logic is structured:

- Authentication logic is handled through the Supabase client in the frontend service layer rather than a separate backend controller.
- Database access is centralized in helper/service files such as:
  - `lib/auth.ts`
  - `lib/profileService.ts`
  - `lib/saveguardians.ts`
  - `lib/editguardians.ts`
  - `lib/report.ts`
  - `lib/sosService.ts`
  - `lib/sosLiveTracking.ts`
  - `services/sendSOSWhatsAppAlert.ts`
  - `hooks/notifyVerifiedGuardians.ts`
- Google APIs are called directly from the client via `services/GooglePlacesService.ts`.

APIs / Edge Functions / routes / services visible:

- Supabase Edge Function:
  - `supabase/functions/sos-whatsapp-alert/index.ts`
- Client-callable business services:
  - `services/sendSOSWhatsAppAlert.ts`
  - `services/sendSOS.ts`
  - `services/sendSOSAlert.ts`
  - `services/startSOSConference.ts`
  - `lib/sosService.ts`
  - `lib/sosLiveTracking.ts`
  - `hooks/notifyVerifiedGuardians.ts`

How business logic is handled:

- SOS orchestration is mainly in `lib/sosService.ts`.
- Guardian selection and alert message preparation are in `hooks/notifyVerifiedGuardians.ts`.
- Place-search heuristics are in `services/GooglePlacesService.ts`.
- Profile merging is in `lib/profileService.ts`.
- Reports are inserted through `lib/report.ts`.

Recent implementation detail visible in the current working tree:

- `startSOS()` in `lib/sosService.ts` now avoids a second database read after session creation and avoids re-reading the session again after alert-state updates; it keeps the local `storedSession` cache in sync directly.
- `dispatchGuardianAlert()` in `hooks/notifyVerifiedGuardians.ts` now uses the caller-provided `senderName`, `latitude`, and `longitude` directly instead of re-fetching session or location data.

How external integrations are handled:

- Meta WhatsApp Cloud API:
  - Called from `supabase/functions/sos-whatsapp-alert/index.ts`
  - Requires secrets such as WhatsApp token and phone number ID
- Google Places / Place Details / Directions:
  - Called directly from `services/GooglePlacesService.ts`
  - Requires `EXPO_PUBLIC_GOOGLE_API_KEY`
- Google Maps link launching:
  - Used throughout map and SOS screens with deep links or web URLs

How authentication is handled on the backend:

- Supabase Auth is the actual auth backend.
- Client screens call methods such as:
  - `supabase.auth.signInWithPassword`
  - `supabase.auth.signInWithOtp`
  - `supabase.auth.verifyOtp`
  - `supabase.auth.updateUser`
  - `supabase.auth.getSession`
- `db_schema.sql` defines row-level security policies for `profiles`, `guardians`, `live_locations`, `sos_sessions`, and `sos_locations`.

Important backend observations from code evidence:

- `db_schema.sql` creates `profiles`, `guardians`, `live_locations`, `sos_sessions`, and `sos_locations`.
- `database.types.ts` also includes a `reports` table, but `db_schema.sql` does not define it.
- The app uses a `posts` table in `lib/newsApi.ts`, but no `posts` table definition is visible in `db_schema.sql` or `database.types.ts`.
- `app/editProfile.tsx` uploads to an `avatars` storage bucket, but there is no bucket creation script visible in the repository.
- `db_schema.sql` gives `guardians` insert/select/delete policies, but no guardian update policy is visible, even though `saveGuardians()` uses `update` for existing rows.

Important backend files and folders:

- `supabase/functions/sos-whatsapp-alert/index.ts`
- `supabase/functions/sos-whatsapp-alert/deno.json`
- `supabase/config.toml`
- `db_schema.sql`
- `docs/sos-live-tracking.sql`
- `database.types.ts`
- `lib/sosService.ts`
- `hooks/notifyVerifiedGuardians.ts`
- `lib/saveguardians.ts`
- `lib/profileService.ts`
- `lib/report.ts`

### 3.5 Frontend Implementation Evidence

The frontend is an Expo Router application organized by routes under the `app/` directory.

Frontend framework and structure:

- Root stack:
  - `app/_layout.tsx`
- Root styling entry:
  - `app/global.css`
- Session gate:
  - `app/session.tsx`
- Protected tab shell:
  - `app/(tabs)/_layout.tsx`
- Main tab routes:
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/extra.tsx`
  - `app/(tabs)/map.tsx`
  - `app/(tabs)/news.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/(tabs)/heatmap.tsx`
- Auth routes:
  - `app/auth/login.tsx`
  - `app/auth/sign-up.tsx`
  - `app/auth/sign-up-password.tsx`
  - `app/auth/sign-up-email.tsx`
  - `app/auth/otp.tsx`
  - `app/auth/forgot-password.tsx`
  - `app/auth/change-password.tsx`
  - `app/auth/addguardians.tsx`
  - `app/auth/editguardians.tsx`
- SOS routes:
  - `app/sos/loading.tsx`
  - `app/sos/active.tsx`
  - `app/sos/[token].tsx`
- Other routes:
  - `app/editProfile.tsx`
  - `app/report.tsx`
  - `app/createpost.tsx`

App screen structure and navigation flow:

- App startup:
  - `app/index.tsx` redirects to `/(tabs)`
  - `app/(tabs)/_layout.tsx` redirects to `/auth/login` if no session
- Auth flow:
  - `login` -> protected tabs
  - `sign-up` -> `sign-up-password` -> `sign-up-email` -> `otp` -> `auth/setup`
- Guardian flow:
  - signup can route into `auth/setup`, which re-exports `addguardians`
  - profile can route to `auth/editguardians`
- SOS flow:
  - home tab -> `sos/loading` -> `sos/active`
  - shared link -> `sos/[token]`

Reusable components visible:

- `components/backButton.tsx`
- `components/theme/ThemeContext.tsx`
- `components/sos/SOSActiveScreen.native.tsx`
- `components/sos/SOSActiveScreen.tsx`
- `components/sos/SOSShareScreen.native.tsx`
- `components/sos/SOSShareScreen.tsx`
- `components/tabs/MapScreen.native.tsx`
- `components/tabs/MapScreen.tsx`
- `components/tabs/HeatmapScreen.native.tsx`
- `components/tabs/HeatmapScreen.tsx`
- `components/LocationPreviewMap.native.tsx`
- `components/LocationPreviewMap.web.tsx`

Forms and UI logic:

- Uses React hooks and local component state rather than Redux/MobX.
- Signup uses a temporary in-memory draft (`lib/signup-draft.ts`).
- Guardian management uses local arrays of contacts before persistence.
- Profile editing uses controlled inputs and saves through Supabase.
- Report flow uses step state (`VERIFY`, `DETAILS`, `SAFETY_CHECK`, `RESOLUTION`).

State management approach:

- Local `useState`, `useEffect`, `useMemo`, `useRef`, and `useCallback`
- Theme context via `components/theme/ThemeContext.tsx`
- i18n global instance via `lib/i18n.ts`
- AsyncStorage for lightweight persistent local state

Frontend services/helpers:

- Auth/session: `lib/auth.ts`, `lib/superbase.ts`
- Profile merge: `lib/profileService.ts`
- Guardian persistence: `lib/saveguardians.ts`, `lib/editguardians.ts`
- SOS flow: `lib/sosService.ts`, `lib/sosLiveTracking.ts`, `lib/sosTask.ts`
- Places: `services/GooglePlacesService.ts`
- Reports: `lib/report.ts`
- News/posts: `lib/newsApi.ts`
- Internet status: `hooks/useInternetStatus.ts`

Styling approach:

- Mixed approach:
  - NativeWind/Tailwind `className`
  - `StyleSheet.create()`
  - theme-based inline styles using `ThemeContext`
- Supporting config:
  - `app/global.css`
  - `app/_layout.tsx`
  - `tailwind.config.js`
  - `metro.config.js`
  - `babel.config.js`

Platform-specific implementations:

- Several screens use `.native.tsx` and `.tsx` / `.web.tsx` variants.
- Native mobile uses `react-native-maps`.
- Web fallbacks often use iframes instead of native maps.

Important frontend files and folders:

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/extra.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/news.tsx`
- `components/tabs/MapScreen.native.tsx`
- `components/sos/SOSActiveScreen.native.tsx`
- `components/sos/SOSShareScreen.native.tsx`
- `lib/sosService.ts`
- `components/theme/ThemeContext.tsx`
- `lib/i18n.ts`

### 3.6 Data Science or Hardware Component

Based on the current codebase, this section is mostly not applicable.

What is actually visible:

- GPS/location access through `expo-location`
- background location task registration through `expo-task-manager`
- camera/media library access through `expo-image-picker`
- voice-search related code/comments in `components/tabs/MapScreen.native.tsx`

What is not visibly implemented:

- no AI/ML model
- no machine learning pipeline
- no analytics model or predictive system
- no wearable integration
- no IoT hardware integration
- no sensor fusion beyond standard device location

Therefore:

- Data science / AI / ML: Not clearly visible in the codebase.
- Hardware / IoT / wearable integration: Not clearly visible beyond standard mobile-device GPS and media permissions.

### 3.7 Git Repository / Collaboration Evidence

Visible collaboration evidence:

- Multiple local/remote branches exist:
  - `main`
  - `gagana`
  - `nimsara`
  - `origin/amaya`
  - `origin/chamethya`
  - `origin/rivindu`
  - `origin/shenal`
  - `origin/EmergencyContacts-Chamethya`
- Merge commits reference pull requests:
  - `Merge pull request #72`
  - `Merge pull request #71`
  - `Merge pull request #70`
  - `Merge pull request #69`
  - `Merge pull request #68`
- Commit-message style is mixed but includes prefixes such as `fix:`, `perf:`, and `style:`.
- `git shortlog -sn HEAD` shows multiple contributors, including:
  - Chamethya Yasodie
  - Shenal Arosha
  - Rivindu Sanjula
  - Gagana Perera
  - Hasini Nimsara

What is not clearly visible:

- no `.github/workflows/` CI files
- no issue templates
- no PR templates
- no contribution guide
- `README.md` is still the generic Expo starter README, not a team collaboration guide

Useful report evidence:

- The Git history supports the claim that the project was worked on collaboratively with multiple branches and merged changes.
- The repository does not provide formal collaboration documentation beyond branch/commit history.

### 3.8 Deployment / CI-CD Evidence

Environment configuration files visible:

- `.env`
- `.env.example`
- `app.config.js`
- `app.json`

Expo / build setup evidence:

- `package.json` scripts:
  - `start`
  - `start:go`
  - `start:tunnel`
  - `start:dev`
  - `android`
  - `ios`
  - `web`
  - `test`
  - `lint`
- `app.config.js` sets:
  - bundle/package identifiers
  - Google Maps API key injection
  - background location permissions
  - static web output
  - Supabase-related env variables

Static/web deployment evidence:

- `dist/` contains generated HTML for many routes, including:
  - `dist/index.html`
  - `dist/(tabs)/index.html`
  - `dist/sos/[token].html`
  - `dist/sos/active.html`
- This strongly suggests that a static web export has already been generated.

Supabase deployment evidence:

- `supabase/config.toml` indicates Supabase CLI configuration for local development.
- `supabase/functions/sos-whatsapp-alert/` contains a deployable Edge Function.
- `docs/whatsapp-sos-setup.md` and `docs/twilio-sos-setup.md` contain manual deployment instructions for Supabase functions and secrets.

Docker/dev-hosting evidence:

- `Dockerfile` starts Expo in tunnel mode.
- `docker-compose.yml` exposes Expo ports and mounts the working directory.

CI/CD evidence:

- No GitHub Actions or other CI pipeline files are visible.
- No `eas.json` file is visible, so EAS build configuration is not present in the inspected codebase.

Important implementation observations:

- `supabase/config.toml` has `db.seed.enabled = true` and refers to `./seed.sql`, but no `supabase/seed.sql` file is visible.
- `supabase/config.toml` has `schema_paths = []`, so visible schema migration setup is incomplete or manual.
- `.env.example` still points `EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL` to a Twilio function, even though the current repo only contains the WhatsApp edge function.

What deployment process appears to exist based on files:

- Mobile development: manual Expo local run using `expo start` / `expo run:android` / `expo run:ios`
- Web deployment: likely `expo export` or equivalent static export, based on the populated `dist/` folder
- Backend deployment: manual Supabase CLI deployment of edge functions and manual setup of Supabase secrets
- CI/CD: not clearly visible in the codebase

### 3.9 CRUD Operations Evidence

#### Profiles

- Entity involved: `profiles`
- Create action:
  - `app/auth/otp.tsx` upserts a profile row after email verification
  - `app/editProfile.tsx` also uses upsert
- Read action:
  - `lib/profileService.ts` reads the profile row and merges it with auth metadata
  - `app/(tabs)/profile.tsx` displays the merged data
- Update action:
  - `app/editProfile.tsx`
  - `app/(tabs)/profile.tsx` for preferences, language, location
  - `app/_layout.tsx` for `push_token`
- Delete action:
  - not visible
- Files involved:
  - `app/auth/otp.tsx`
  - `lib/profileService.ts`
  - `app/(tabs)/profile.tsx`
  - `app/editProfile.tsx`
  - `app/_layout.tsx`
- CRUD completeness: Partial CRUD. Create/read/update are visible. Delete is not visible.

#### Guardians

- Entity involved: `guardians`
- Create action:
  - `lib/saveguardians.ts` insert path
  - triggered from `app/auth/addguardians.tsx`
- Read action:
  - `app/auth/addguardians.tsx`
  - `lib/editguardians.ts`
  - `hooks/notifyVerifiedGuardians.ts`
- Update action:
  - `lib/saveguardians.ts` update fallback path for existing row
  - triggered from `app/auth/editguardians.tsx`
- Delete action:
  - per-contact removal in UI by rewriting fields to null on save
  - no explicit database `delete()` call visible in app code
- Files involved:
  - `app/auth/addguardians.tsx`
  - `app/auth/editguardians.tsx`
  - `lib/saveguardians.ts`
  - `lib/editguardians.ts`
  - `hooks/notifyVerifiedGuardians.ts`
- CRUD completeness: Partial CRUD. Create/read/update are visible. Delete is indirect/partial rather than explicit.

#### SOS Sessions

- Entity involved: `sos_sessions`
- Create action:
  - `createSOSSessionRecord()` in `lib/sosService.ts`
  - `startSOS()` in `lib/sosService.ts`
  - `startSOS()` in `lib/sosLiveTracking.ts` for share-token based flow
- Read action:
  - `getActiveSOSSessionForUser()`
  - `getSOSSessionById()`
  - `getSOSSessionByShareToken()`
  - active/share screens
- Update action:
  - `updateSOSSessionLocation()`
  - `updateSOSSessionAlertState()`
  - `stopSOS()` in `lib/sosService.ts`
  - `stopSOS()` in `lib/sosLiveTracking.ts`
- Delete action:
  - not visible
- Files involved:
  - `lib/sosService.ts`
  - `lib/sosLiveTracking.ts`
  - `components/sos/SOSActiveScreen.native.tsx`
  - `components/sos/SOSShareScreen.native.tsx`
- CRUD completeness: Partial CRUD. Create/read/update are visible. Delete is not visible.

#### SOS Location History

- Entity involved: `sos_locations`
- Create action:
  - `updateSOSSessionLocation()` inserts a new location point
- Read action:
  - no visible frontend read of `sos_locations`; the app mostly reads the latest location from `sos_sessions`
- Update action:
  - not visible
- Delete action:
  - not visible
- Files involved:
  - `lib/sosService.ts`
  - `db_schema.sql`
- CRUD completeness: Partial. Only create is clearly used by the app.

#### Reports

- Entity involved: `reports`
- Create action:
  - `saveReport()` called from `app/report.tsx`
- Read action:
  - not visible
- Update action:
  - not visible
- Delete action:
  - not visible
- Files involved:
  - `app/report.tsx`
  - `lib/report.ts`
  - `database.types.ts`
- CRUD completeness: Partial. Only create is visible.

#### Posts

- Entity involved: `posts`
- Create action:
  - `createPost()` in `lib/newsApi.ts`
  - called from `app/createpost.tsx`
- Read action:
  - `fetchPosts()` in `lib/newsApi.ts`
  - used by `app/(tabs)/news.tsx`
- Update action:
  - not implemented; only commented-out code exists
- Delete action:
  - not implemented; only commented-out code exists
- Files involved:
  - `app/(tabs)/news.tsx`
  - `app/createpost.tsx`
  - `lib/newsApi.ts`
- CRUD completeness: Partial. Create/read visible, update/delete not implemented.

#### Avatar Storage

- Entity involved: `avatars` storage bucket plus `profiles.avatar_url`
- Create action:
  - image upload in `app/editProfile.tsx`
- Read action:
  - profile screens read `avatar_url` and display the image
- Update action:
  - re-upload and profile upsert overwrite the current avatar URL
- Delete action:
  - not visible
- Files involved:
  - `app/editProfile.tsx`
  - `app/(tabs)/profile.tsx`
  - `lib/profileService.ts`
- CRUD completeness: Partial. Create/read/update visible. Delete not visible.

## 4. CHAPTER 4 EVIDENCE – CONCLUSION

### 4.1 Chapter 4 Summary Notes

The Conclusion chapter should present the project as a substantial working prototype with a clearly implemented safety core, not as a fully completed production system.

The most defensible concluding points from the codebase are:

- The project successfully implements a mobile safety workflow centered on SOS initiation, guardian handling, and location sharing.
- The project also includes supporting features such as nearby emergency services, map exploration, user profile management, and multilingual settings.
- Some modules are still prototype-level or inconsistent across code/docs/schema, so the conclusion should acknowledge partial completion rather than claiming full production readiness.
- The most important future work areas are backend hardening, schema cleanup, alert-delivery consistency, and deployment/documentation alignment.

### 4.2 Achievements of Aims and Objectives

The repository does not contain a formal “aims and objectives” document. The following objectives are carefully inferred from the implemented features.

#### Inferred objective: Provide secure user registration and account access

- Evidence supporting it:
  - login with Supabase Auth
  - multi-step signup
  - OTP verification
  - password reset and password change
- Files/modules proving it:
  - `app/auth/login.tsx`
  - `app/auth/sign-up.tsx`
  - `app/auth/sign-up-password.tsx`
  - `app/auth/sign-up-email.tsx`
  - `app/auth/otp.tsx`
  - `app/auth/forgot-password.tsx`
  - `app/auth/change-password.tsx`
  - `lib/auth.ts`

#### Inferred objective: Allow users to maintain emergency guardian contacts

- Evidence supporting it:
  - dedicated guardian setup and edit screens
  - Supabase persistence
  - AsyncStorage fallback cache
  - guardian count shown on home dashboard
- Files/modules proving it:
  - `app/auth/addguardians.tsx`
  - `app/auth/editguardians.tsx`
  - `lib/saveguardians.ts`
  - `lib/editguardians.ts`
  - `hooks/notifyVerifiedGuardians.ts`
  - `app/(tabs)/index.tsx`

#### Inferred objective: Let users trigger emergency help quickly from the mobile app

- Evidence supporting it:
  - single-tap Quick SOS
  - triple-tap Emergency SOS
  - active SOS loading and monitoring screens
  - 119 call integration
- Files/modules proving it:
  - `app/(tabs)/index.tsx`
  - `lib/sosTap.ts`
  - `app/sos/loading.tsx`
  - `components/sos/SOSActiveScreen.native.tsx`
  - `lib/sosService.ts`

#### Inferred objective: Share the user’s location during an SOS incident

- Evidence supporting it:
  - `sos_sessions` and `sos_locations` tables
  - initial and repeated location updates
  - background tracking task
  - public share-token page
- Files/modules proving it:
  - `db_schema.sql`
  - `docs/sos-live-tracking.sql`
  - `lib/sosService.ts`
  - `lib/sosTask.ts`
  - `lib/sosLiveTracking.ts`
  - `components/sos/SOSShareScreen.native.tsx`
  - `components/sos/SOSActiveScreen.native.tsx`

#### Inferred objective: Help users reach emergency services nearby

- Evidence supporting it:
  - emergency hotline cards
  - nearby hospital/police functionality
  - map navigation and place search
- Files/modules proving it:
  - `app/(tabs)/extra.tsx`
  - `components/tabs/MapScreen.native.tsx`
  - `services/GooglePlacesService.ts`
  - `services/GooglePlacesService.test.ts`

#### Inferred objective: Provide user profile and preference customization

- Evidence supporting it:
  - editable profile
  - avatar upload
  - theme switch
  - language selection
  - privacy/notification/live-location toggles
- Files/modules proving it:
  - `app/(tabs)/profile.tsx`
  - `app/editProfile.tsx`
  - `components/theme/ThemeContext.tsx`
  - `lib/i18n.ts`
  - `lib/profileService.ts`

Objectives that are only partially supported and therefore should not be overstated as fully achieved:

- automated guardian messaging
- guardian verification
- incident analytics/heatmap backed by real alert data
- community/news backend completeness

### 4.3 Deviations from Original Scope

Possible deviations inferred from implementation:

#### Possible deviation inferred from implementation: Twilio/SMS workflow appears to have been replaced by WhatsApp

- Evidence:
  - legacy docs and services still reference Twilio:
    - `docs/twilio-sos-setup.md`
    - `services/sendSOS.ts`
    - `services/sendSOSAlert.ts`
    - `services/startSOSConference.ts`
  - current server-side function in the repo is only:
    - `supabase/functions/sos-whatsapp-alert/index.ts`
  - recent Git history includes:
    - `Remove Twilio conference and alert functions, update WhatsApp alert...`
- Interpretation:
  - the project likely moved from a Twilio SMS/conference concept to a WhatsApp-based alert approach.

#### Possible deviation inferred from implementation: Live-link alerting appears simplified in the automated WhatsApp path

- Evidence:
  - `buildSOSAlertMessage()` in `hooks/notifyVerifiedGuardians.ts` uses the app’s `liveLocationLink`
  - `supabase/functions/sos-whatsapp-alert/index.ts` actually sends `https://maps.google.com/?q=<lat>,<lng>`
  - the function request body does not include `shareUrl` or `shareToken`
- Interpretation:
  - the documented/expected live share-link alert appears simplified to a coordinate snapshot link in the automated path.

#### Possible deviation inferred from implementation: Guardian verification seems planned but not finished

- Evidence:
  - `guardians` schema has `g1_verified` ... `g5_verified`
  - `extractGuardianRecipients()` prefers verified guardians
  - comments in `app/auth/otp.tsx` explicitly discuss guardian OTP verification, then state that it is being skipped for now
- Interpretation:
  - guardian verification looks planned in the data model but not implemented in the visible UI flow.

#### Possible deviation inferred from implementation: Heatmap is prototype-only rather than real backend analytics

- Evidence:
  - `services/sosHeatmap.ts` contains `dummySosAlerts`
  - comments explicitly say to replace dummy data later
- Interpretation:
  - heatmap functionality exists visually, but not as a completed data-driven feature.

#### Possible deviation inferred from implementation: Map and emergency services use in-app navigation rather than always opening the device maps app

- Evidence:
  - `test-evidence/functional-test-plan.md` explicitly notes that the Emergency Services page opens the in-app Map tab with `placeId`, not the system Maps app
  - `app/(tabs)/extra.tsx` routes to `/(tabs)/map`
- Interpretation:
  - if original requirements expected direct system-map launching, the implementation currently favors in-app map navigation first.

### 4.4 Limitations of the Project

Only limitations supported by code evidence are listed below.

#### Database/schema consistency limitations

- `db_schema.sql` does not define `reports`, `posts`, `language`, `push_token`, or the `avatars` bucket, even though app code relies on them.
- `database.types.ts` and `db_schema.sql` do not fully match. Example: `guardians.id` is typed as `number` in `database.types.ts` but created as `UUID` in `db_schema.sql`.
- `saveGuardians()` uses `update`, but no guardian update RLS policy is visible in `db_schema.sql`.

#### Alert-delivery limitations

- The current automated WhatsApp function sends a Google Maps snapshot link rather than the app’s live `/sos/<token>` tracking URL.
- The edge function code does not visibly validate the active SOS session or load guardians from the database, despite documentation saying it does.
- A legacy `notifyVerifiedGuardians()` path still invokes a missing Supabase function named `send-sos-sms`.

#### Deployment/setup limitations

- `.env.example` still points to a Twilio webhook URL instead of the current WhatsApp function.
- `supabase/config.toml` references `supabase/seed.sql`, but that file is not present.
- No CI workflow files or EAS configuration are visible.
- `README.md` is still the default Expo starter README, so project setup documentation is incomplete.

#### Security/privacy limitations

- `.env` is tracked in Git (`git ls-files` shows `.env`), which is a security risk for environment-secret handling.
- `db_schema.sql` allows `Anyone can view active sos sessions`, which means active SOS session rows are publicly selectable at the policy level while active.
- `db_schema.sql` also allows public select on active `live_locations`, even though the app does not visibly use that table.

#### Quality/tooling limitations

- `npm run lint` currently fails with multiple issues, including:
  - unresolved `./global.css` import in `app/_layout.tsx` even though `app/global.css` now exists in the working tree, which suggests a resolver or lint-configuration mismatch
  - React hook rule errors in `app/report.tsx`
  - multiple warnings for unused variables and missing hook dependencies
- There are automated tests, but no visible integration tests for:
  - Supabase Auth against a real backend
  - the WhatsApp edge function
  - a full end-to-end SOS flow

#### Feature-completion limitations

- Heatmap uses dummy data only.
- News/posts feature lacks visible schema support and does not fully implement media rendering or update/delete.
- Incident report feature saves a row but has no visible read/update/delete flow.
- The unsafe resolution step in `app/report.tsx` shows an `EMERGENCY` button without an action.
- The report text says `call 911`, which is inconsistent with the rest of the app’s Sri Lankan emergency-number context.
- Mobile voice search is not operational in the visible implementation.
- Push notification token capture exists, but no notification sending pipeline is visible.

### 4.5 Future Enhancements

These enhancements are directly grounded in incomplete or expandable parts of the current codebase.

- Replace the automated WhatsApp message’s static Google Maps link with the actual live `/sos/<token>` share URL used elsewhere in the SOS flow.
- Align the WhatsApp edge function, environment-variable names, and setup documentation so deployment instructions match the real implementation.
- Add a proper guardian verification workflow to make use of the `g1_verified` to `g5_verified` fields.
- Add database/schema definitions and migrations for:
  - `reports`
  - `posts`
  - `language`
  - `push_token`
  - `avatars` storage bucket
- Connect the heatmap to real SOS data instead of `dummySosAlerts`.
- Implement explicit delete flows where only partial CRUD exists now, especially for posts and possibly full guardian-row deletion.
- Add push-notification delivery logic if the stored push token is intended to be used.
- Add stronger end-to-end tests for the complete SOS flow, including backend function testing.
- Clean up legacy Twilio/SMS code and documentation if WhatsApp is now the permanent alert channel.
- Improve the report module by wiring the unsafe-state emergency button and aligning emergency-number text with the project’s region.
- Finish or remove unused voice-search functionality to reduce partial/unfinished code.
- Add CI/CD configuration, better README documentation, and a safer secret-management approach that does not track `.env`.

### 4.6 Extra Work Evidence

No clear evidence of hackathon references, competitions, research papers, conference/demo submissions, poster assets, or presentation/video files is visible in the inspected repository.

Visible extra documentation is limited to:

- `docs/sos-live-tracking.sql`
- `docs/twilio-sos-setup.md`
- `docs/whatsapp-sos-setup.md`
- `test-evidence/functional-test-plan.md`
- `test-evidence/jest-results.json`

### 4.7 Concluding Remarks Notes

Another AI writing the final concluding remarks should emphasize:

- the project has a real, working mobile safety core rather than only static UI screens,
- the SOS workflow, guardian management, nearby services, and profile management are the strongest completed areas,
- the project is best described as a strong functional prototype with several backend/deployment inconsistencies still needing hardening,
- future work should focus on production-readiness, schema alignment, messaging reliability, and data-driven analytics.

It should avoid claiming:

- fully complete backend schema coverage,
- fully production-ready alert delivery,
- real analytics-backed heatmaps,
- complete admin/back-office functionality.

## 5. DATABASE AND DATA FLOW

Database/storage system visibly used:

- Supabase Postgres database
- Supabase Auth
- Supabase Realtime
- Supabase Storage

Important tables/entities/collections visible:

- `profiles`
- `guardians`
- `live_locations`
- `sos_sessions`
- `sos_locations`
- `reports` (visible in `database.types.ts` and app code, not in `db_schema.sql`)
- `posts` (visible in app code only, not in visible SQL/type files)
- `avatars` storage bucket (visible in app code only)

How data moves through the app:

#### Authentication data

- User account authentication is handled by Supabase Auth.
- The app stores auth sessions using:
  - AsyncStorage on native (`lib/superbase.ts`)
  - localStorage on web (`lib/superbase.ts`)
- Signup writes extra app profile data into `profiles` after OTP verification.

#### User/profile data

- Auth data source: `auth.users` metadata from Supabase Auth
- App profile data source: `profiles`
- `lib/profileService.ts` merges both sources into a single object for the UI.
- Profile updates from:
  - `app/auth/otp.tsx`
  - `app/editProfile.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/_layout.tsx` for push token

#### Guardian/contact data

- Guardian contacts are stored in a single `guardians` row per user using flattened fields:
  - `g1_name`, `g1_phone`, `g1_verified`
  - ...
  - `g5_name`, `g5_phone`, `g5_verified`
- `lib/saveguardians.ts` writes this row.
- `lib/editguardians.ts` and `hooks/notifyVerifiedGuardians.ts` read it.
- A local cache copy is stored in AsyncStorage using `guardians_cache_<userId>`.

#### SOS alert/session data

- `sos_sessions` stores:
  - user ID
  - mode (`quick` or `emergency`)
  - share token
  - status
  - user name
  - guardian count
  - alert-delivery method/status
  - first and latest coordinates
  - timestamps
- `sos_locations` stores each recorded point during tracking.
- `lib/sosService.ts` is the main writer for both tables.

#### Location data

- The active SOS flow writes location into:
  - `sos_sessions.last_lat`
  - `sos_sessions.last_lng`
  - `sos_sessions.first_lat`
  - `sos_sessions.first_lng`
  - `sos_locations`
- `live_locations` also exists in schema, but the current SOS implementation does not visibly write to or read from it.

#### Reports data

- `app/report.tsx` sends report data to `lib/report.ts`
- `lib/report.ts` inserts into `reports`
- The table definition is visible in `database.types.ts` but not in `db_schema.sql`

#### Posts/news data

- `app/(tabs)/news.tsx` calls `fetchPosts()`
- `app/createpost.tsx` calls `createPost()`
- `lib/newsApi.ts` reads/writes `posts`
- The `posts` table is not visible in the SQL or generated types included in the repo

Schema / migration evidence summary:

- `db_schema.sql` is the main visible schema file.
- `docs/sos-live-tracking.sql` documents SOS session schema separately.
- `supabase/config.toml` does not point to schema files through `schema_paths`, so visible migration automation is incomplete.

Important schema observations from `db_schema.sql`:

- `profiles` is linked to `auth.users(id)`
- `guardians` is linked to `auth.users(id)`
- `sos_sessions` is linked to `auth.users(id)` and has a unique active-session-per-user index
- `sos_locations` is linked to `sos_sessions(id)`
- RLS is enabled on all visible core tables
- Public read policies exist for active SOS/live-location sharing

## 6. EMERGENCY ALERT FLOW TRACE

This section traces the current SOS flow from UI to backend based on actual code paths.

### Step 1: SOS starts from the home screen

- Trigger source:
  - `app/(tabs)/index.tsx`
- What happens:
  - The SOS button records tap timestamps.
  - One tap starts Quick SOS after the `EMERGENCY_SOS_TAP_WINDOW_MS` delay.
  - Three quick taps start Emergency SOS immediately.
- Supporting logic:
  - `lib/sosTap.ts`
- Route transition:
  - `router.push({ pathname: "/sos/loading", params: { mode } })`

### Step 2: Loading screen starts the SOS service flow

- Screen:
  - `app/sos/loading.tsx`
- What happens:
  - Reads `mode` from route params.
  - Chooses `startQuickSOS` or `startEmergencySOS` from `lib/sosService.ts`.
  - Displays progress steps:
    - creating session
    - capturing location
    - alerting guardians
    - starting tracking
- Success handling:
  - navigates to `/sos/active` with:
    - `sessionId`
    - `autoCall=1` for emergency mode
- Error handling:
  - uses `getSOSStatusMessage(error)` to show a user-facing message
  - offers `Back Home` or `Try Again`

### Step 3: Current user and guardian context are loaded

- Service:
  - `getCurrentSOSContext()` in `lib/sosService.ts`
- What happens:
  - calls `supabase.auth.getSession()`
  - rejects if the user is not authenticated
  - reads `profiles.full_name` and `profiles.live_location`
  - loads guardians using `loadGuardianRecipients(user.id)`
- Guardian loading details:
  - `loadGuardianRecipients()` in `hooks/notifyVerifiedGuardians.ts`
  - reads the `guardians` row from Supabase
  - converts flat DB columns into recipient objects
  - if no remote data, falls back to AsyncStorage cached guardians
  - prefers verified guardians if any `gX_verified` fields are true

### Step 4: Preconditions are enforced

- Service:
  - `startSOS()` in `lib/sosService.ts`
- Checks made:
  - live location must be enabled in the profile
  - at least one guardian must exist
  - if an active SOS already exists for the user, reuse it instead of creating a new one

### Step 5: Location permissions are requested

- Service:
  - `ensureSOSLocationPermissions()` in `lib/sosService.ts`
- What happens:
  - checks whether location services are enabled
  - requests foreground permission
  - on native mobile, also requests background location permission
- Error handling:
  - throws clear errors if GPS or permissions are not available

### Step 6: SOS session record is created in Supabase

- Service:
  - `createSOSSessionRecord()` in `lib/sosService.ts`
- Database table:
  - `sos_sessions`
- What is inserted:
  - `user_id`
  - `user_name`
  - `mode`
  - `status = active`
  - `guardian_count`
  - `alert_delivery_status = pending`
- Additional logic:
  - if insert fails with duplicate active-session constraint (`23505`), it loads the existing active session instead

### Step 7: Initial location is captured and written

- Service:
  - `getBestAvailableLocation()` in `lib/sosService.ts`
  - `updateSOSSessionLocation()` in `lib/sosService.ts`
- What happens:
  - tries `Location.getCurrentPositionAsync()` first using `Location.Accuracy.Balanced` for the initial SOS startup
  - falls back to `Location.getLastKnownPositionAsync()`
  - updates the SOS session row with:
    - `first_lat`
    - `first_lng`
    - `last_lat`
    - `last_lng`
    - `accuracy`
    - `last_updated_at`
  - inserts a point into `sos_locations`
- Local cache:
  - the session snapshot is stored in AsyncStorage through `saveStoredActiveSOSSession()`

### Step 8: Guardian alert dispatch begins

- Service:
  - `dispatchGuardianAlert()` in `hooks/notifyVerifiedGuardians.ts`
- Inputs from `startSOS()`:
  - guardians
  - current latitude/longitude
  - `liveLocationLink`
  - SOS mode
  - sender name
  - session ID
  - start time
- Recent implementation detail:
  - `startSOS()` uses the already-created session row and the first captured coordinates directly, so it does not perform an extra database read before starting guardian alert delivery.
- Message generation:
  - `buildSOSAlertMessage()` creates a human-readable SOS message containing the live link and start time

### Step 9: Automated WhatsApp alert path

- Client-side function:
  - `sendSOSWhatsAppAlert()` in `services/sendSOSWhatsAppAlert.ts`
- Current client-side behavior in `dispatchGuardianAlert()`:
  - it does not refresh the Supabase session
  - it does not re-fetch the user profile or current GPS coordinates
  - it forwards the caller-provided guardian list, sender name, latitude, and longitude directly into `sendSOSWhatsAppAlert()`
- Invocation method:
  - `supabase.functions.invoke("sos-whatsapp-alert", { body: ... })`
- Request body actually sent:
  - `guardians`
  - `userName`
  - `latitude`
  - `longitude`
- Important evidence:
  - The live-share URL is not passed into the edge function request body.

### Step 10: Supabase Edge Function sends WhatsApp messages

- Edge function:
  - `supabase/functions/sos-whatsapp-alert/index.ts`
- What it does:
  - reads Deno environment variables `WHATSAPP_TOKEN` and `PHONE_NUMBER_ID`
  - validates request method and request-body presence
  - requires a non-empty guardians array and valid latitude/longitude
  - builds a Google Maps link using `https://maps.google.com/?q=<lat>,<lng>`
  - builds a WhatsApp template payload
  - posts to Meta Graph API
  - returns `sentCount`, `failedCount`, `results`, and `success`
- What it does not visibly do:
  - it does not query Supabase to validate the active SOS session
  - it does not load guardians from the database
  - it does not use the `/sos/<share-token>` live-tracking URL

### Step 11: Fallback if automated delivery fails

- In `dispatchGuardianAlert()`:
  - any error falls back to:
    - `method: "manual-whatsapp"`
    - `status: "pending"`
- Effect in the UI:
  - `components/sos/SOSActiveScreen.native.tsx` and `components/sos/SOSActiveScreen.tsx` show an `Alert Guardians` button when delivery is pending
- Manual send path:
  - `openPendingGuardianAlert()` in `lib/sosService.ts`
  - `openGuardianAlertComposer()` in `hooks/notifyVerifiedGuardians.ts`
- What happens:
  - tries to deep link into WhatsApp
  - if deep linking fails, opens the general share sheet

### Step 12: Alert status is written back to the SOS session

- Service:
  - `updateSOSSessionAlertState()` in `lib/sosService.ts`
- Database table:
  - `sos_sessions`
- Fields updated:
  - `alert_delivery_method`
  - `alert_delivery_status`
  - `guardian_count`
- Local cache handling:
  - after `updateSOSSessionAlertState()` succeeds, `startSOS()` updates the in-memory/local `storedSession` object and saves it back to AsyncStorage instead of re-querying `sos_sessions`

### Step 13: Background tracking starts

- Service:
  - `startLocationTracking()` in `lib/sosService.ts`
- Native mobile path:
  - calls `Location.startLocationUpdatesAsync(SOS_LOCATION_TASK_NAME, ...)`
  - background updates are handled by `lib/sosTask.ts`
- Web path:
  - uses `Location.watchPositionAsync()`
- Ongoing write path:
  - `updateSOSSessionLocation()` keeps refreshing the current session location and appends rows into `sos_locations`

### Step 14: Active SOS screen is shown

- Screen:
  - `components/sos/SOSActiveScreen.native.tsx` on mobile
  - `components/sos/SOSActiveScreen.tsx` on web
- What it shows:
  - live map preview
  - guardian count
  - last update timestamp
  - delivery status
  - stop button
  - share link button
  - call 119 button
- Realtime updates:
  - subscribes to `sos_sessions` changes using `subscribeToSOSSessionById()`
- Success handling:
  - if emergency mode, it auto-calls 119 after a short delay
- Error handling:
  - uses `Alert.alert(...)` with messages from `getSOSStatusMessage()`

### Step 15: Shared SOS page tracks the session by token

- Screen:
  - `components/sos/SOSShareScreen.native.tsx`
  - `components/sos/SOSShareScreen.tsx`
- What it does:
  - polls `getSOSSession(token)` every `SOS_TRACKING_POLL_MS`
  - displays latest latitude/longitude and status
  - can open current coordinates in Google Maps

### Step 16: Owner-only tracking update from the share page

- File:
  - `components/sos/SOSShareScreen.native.tsx`
- What happens:
  - if the viewer is also the authenticated owner of the SOS session, the screen:
    - requests location permission
    - gets current position
    - calls `updateLocation(token, latitude, longitude)` every poll interval
- Backend write path:
  - `updateLocation()` in `lib/sosLiveTracking.ts`
  - finds the session by share token
  - calls `updateSOSSessionLocation()`

### Step 17: SOS stop flow

- Stopping from active screen:
  - `stopSOS(sessionId)` in `lib/sosService.ts`
- Stopping from share page:
  - `stopSOS(token)` in `lib/sosLiveTracking.ts`
- What happens:
  - sets `status = ended`
  - sets `ended_at`
  - stops background tracking if using the main active-session stop path
  - clears local active-session cache where applicable

### Error handling visible across the flow

- Permission/GPS errors produce user-friendly alerts.
- Missing DB tables can produce a specialized message:
  - `getSOSStatusMessage()` checks for missing `public.sos_sessions` or `public.sos_locations`.
- Network/automation failures downgrade to manual WhatsApp/share-sheet alerting instead of always cancelling the whole SOS flow.

### Exact files involved in the SOS flow

- `app/(tabs)/index.tsx`
- `lib/sosTap.ts`
- `app/sos/loading.tsx`
- `lib/sosService.ts`
- `hooks/notifyVerifiedGuardians.ts`
- `services/sendSOSWhatsAppAlert.ts`
- `supabase/functions/sos-whatsapp-alert/index.ts`
- `lib/sosTask.ts`
- `lib/sosLiveTracking.ts`
- `components/sos/SOSActiveScreen.native.tsx`
- `components/sos/SOSShareScreen.native.tsx`
- `db_schema.sql`
- `docs/sos-live-tracking.sql`

## 7. FOLDER STRUCTURE SUMMARY

- `app/` -> Expo Router route files, including auth screens, tab screens, SOS screens, report modal, create-post modal, and profile edit screen
- `app/global.css` -> Tailwind base/components/utilities entry stylesheet imported by the root layout
- `app/(tabs)/` -> main authenticated tab routes for Home, Extra, Map, News, Profile, and Heatmap
- `app/auth/` -> authentication and onboarding routes such as login, signup, OTP, guardian setup, forgot-password, and change-password
- `app/sos/` -> SOS loading, active, and share-token routes
- `components/` -> reusable UI elements and platform-specific screen implementations
- `components/sos/` -> active SOS and share-screen components for native/web
- `components/tabs/` -> tab-screen implementations such as map and heatmap
- `components/theme/` -> theme context/provider
- `constants/` -> static icon/image/document references
- `hooks/` -> reusable hooks and guardian-alert helper logic
- `lib/` -> app service layer and utilities such as auth, Supabase client, profile merge, guardian persistence, SOS orchestration, i18n, and reports
- `services/` -> external-integration and domain services such as Google Places, WhatsApp alert invocation, heatmap aggregation, and legacy SOS services
- `supabase/` -> Supabase local configuration and edge functions
- `supabase/functions/` -> serverless functions; currently contains only `sos-whatsapp-alert`
- `docs/` -> setup and schema notes for WhatsApp, Twilio, and SOS live tracking
- `__tests__/` -> Jest test suites for selected flows
- `test-evidence/` -> stored test evidence documents and previous JSON results
- `assets/` -> logos/icons/static image resources
- `dist/` -> generated static web export output
- `scripts/` -> small project utility script(s), currently including `reset-project.js`

## 8. TESTING / QUALITY EVIDENCE

### Automated tests visible in the repository

- `__tests__/sos-tap.test.ts`
  - tests quick/emergency tap recognition
- `__tests__/guardian-alerts.test.ts`
  - tests guardian selection and SOS message formatting
- `__tests__/home.location-preprompt.test.tsx`
  - tests custom location pre-prompt interactions
- `__tests__/extra.emergency-services.test.tsx`
  - tests hotline dialing and map navigation behavior
- `__tests__/sosHeatmap.test.ts`
  - tests heatmap aggregation logic
- `services/GooglePlacesService.test.ts`
  - tests Google Places selection heuristics

### Test tooling/configuration

- `jest.config.js` uses `jest-expo`
- `jest.setup.ts` provides environment variables and mocks for:
  - AsyncStorage
  - expo-router
  - expo-location
  - expo-task-manager
  - react-native-reanimated

### Test execution evidence from this inspection

- Running `npx jest --watchman=false --runInBand` succeeded.
- Result during inspection:
  - 6 test suites passed
  - 31 tests passed
- Additional note:
  - no open-handle warning was observed in this latest run

### Stored test evidence in repository

- `test-evidence/functional-test-plan.md`
- `test-evidence/jest-results.json`

Important note about stored test evidence:

- `test-evidence/jest-results.json` appears to reflect an older or narrower test run than the current repository, because the current repo contains more test files than the JSON report records.

### Validation logic visible in code

- Login validates presence of email/password.
- Signup validates required fields, password length, and password confirmation.
- Forgot-password flow validates OTP length and password length.
- Guardian flow validates non-empty name and minimum phone-length.
- SOS flow validates:
  - authenticated session
  - guardian existence
  - live-location enabled
  - GPS/permission availability
- Edge function validates:
  - HTTP method
  - guardians array presence
  - latitude/longitude presence

### Error handling / defensive programming visible in code

- Extensive `try/catch` blocks around Supabase and device APIs.
- AsyncStorage fallback for guardian reads.
- `getSOSStatusMessage()` maps missing-table errors to a clearer setup instruction.
- Google Places service returns safe fallback values like `null` or `[]` instead of crashing UI code.
- Map and emergency services show alerts for missing GPS or API keys.

### Type safety and code-quality practices

- `tsconfig.json` enables `strict: true`
- Path aliases are configured via `@/*`
- The codebase uses TypeScript types for many services and database entities

Limitations in quality posture also visible:

- There are repeated `as any` casts when writing to Supabase.
- `npm run lint` fails with 9 errors and 20 warnings.
- Some files are clearly stale or partially maintained:
  - `app/global.css` now exists, but lint still reports the `./global.css` import in `app/_layout.tsx` as unresolved
  - lowercase component function name in `app/report.tsx`
  - unused legacy SOS services and dependencies

## 9. IMPORTANT FILES TO SCREENSHOT

### Appendix A – Important Files / Screens / Dashboards to Screenshot

#### Frontend

- Home SOS dashboard:
  - `app/(tabs)/index.tsx`
- SOS loading/progress screen:
  - `app/sos/loading.tsx`
- Active SOS screen:
  - `components/sos/SOSActiveScreen.native.tsx`
- SOS share-token screen:
  - `components/sos/SOSShareScreen.native.tsx`
- Guardian setup screen:
  - `app/auth/addguardians.tsx`
- Guardian edit screen:
  - `app/auth/editguardians.tsx`
- Profile screen:
  - `app/(tabs)/profile.tsx`
- Edit profile screen:
  - `app/editProfile.tsx`
- Emergency services screen:
  - `app/(tabs)/extra.tsx`
- Map screen:
  - `components/tabs/MapScreen.native.tsx`
- News screen:
  - `app/(tabs)/news.tsx`
- Create-post modal:
  - `app/createpost.tsx`
- Report modal:
  - `app/report.tsx`
- Heatmap screen:
  - `components/tabs/HeatmapScreen.native.tsx`

#### Backend

- SOS orchestration service:
  - `lib/sosService.ts`
- Guardian alert service:
  - `hooks/notifyVerifiedGuardians.ts`
- WhatsApp function invocation:
  - `services/sendSOSWhatsAppAlert.ts`
- Supabase Edge Function:
  - `supabase/functions/sos-whatsapp-alert/index.ts`
- Google Places integration:
  - `services/GooglePlacesService.ts`

#### Database

- Main SQL schema:
  - `db_schema.sql`
- SOS live-tracking SQL documentation:
  - `docs/sos-live-tracking.sql`
- Supabase generated database types:
  - `database.types.ts`
- Supabase dashboard screenshots that would be useful:
  - `profiles` table
  - `guardians` table
  - `sos_sessions` table
  - `sos_locations` table
  - `reports` table if it exists remotely
  - `posts` table if it exists remotely
  - `avatars` storage bucket if it exists remotely

#### Deployment

- Expo config:
  - `app.config.js`
- Environment example:
  - `.env.example`
- Supabase config:
  - `supabase/config.toml`
- Docker development setup:
  - `Dockerfile`
  - `docker-compose.yml`
- Static web build evidence:
  - `dist/sos/[token].html`
  - `dist/(tabs)/index.html`

#### Git/GitHub

- `git branch --all` output showing multiple team branches
- `git log --oneline --decorate -n 20` output showing merge commits and PR references
- `git shortlog -sn HEAD` output showing multiple contributors

#### CRUD evidence

- Profile create/update evidence:
  - `app/auth/otp.tsx`
  - `app/editProfile.tsx`
  - `app/(tabs)/profile.tsx`
- Guardian create/read/update evidence:
  - `app/auth/addguardians.tsx`
  - `app/auth/editguardians.tsx`
  - `lib/saveguardians.ts`
  - `lib/editguardians.ts`
- Report create evidence:
  - `app/report.tsx`
  - `lib/report.ts`
- Post create/read evidence:
  - `app/(tabs)/news.tsx`
  - `app/createpost.tsx`
  - `lib/newsApi.ts`

#### SOS flow evidence

- SOS trigger logic:
  - `app/(tabs)/index.tsx`
  - `lib/sosTap.ts`
- SOS loading/start logic:
  - `app/sos/loading.tsx`
  - `lib/sosService.ts`
- Location background task:
  - `lib/sosTask.ts`
- Active SOS UI:
  - `components/sos/SOSActiveScreen.native.tsx`
- Public share flow:
  - `components/sos/SOSShareScreen.native.tsx`
- WhatsApp backend:
  - `services/sendSOSWhatsAppAlert.ts`
  - `supabase/functions/sos-whatsapp-alert/index.ts`

## 10. OUTPUT RULES

This evidence document has been written using the requested constraints:

- Markdown structure
- strong section headings
- codebase-only factual statements
- exact file paths where possible
- explicit distinction between implemented, partial, planned, and not clearly visible
- no invented features

Most important overall accuracy note:

- Several parts of the repository do not fully agree with each other. In particular:
  - app code,
  - SQL schema files,
  - generated database types,
  - setup docs,
  - and legacy SOS service files

Because of that, any final report written from this project should explicitly distinguish:

- what is definitely implemented in running code,
- what is partially implemented,
- what is documented but not present in the repo,
- and what appears to be legacy or replaced.
