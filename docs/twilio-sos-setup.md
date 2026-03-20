# Twilio SOS Setup

This project can send an SOS SMS automatically through Twilio when SOS starts.

## Behavior

1. The app starts an SOS session.
2. The app calls `EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL`.
3. The `sos-twilio-alert` Supabase Edge Function validates the signed-in user and loads the active SOS session.
4. If `SOS_BASE_URL` is configured, the SMS includes a live tracking link like `/sos/<token>`.
5. If `SOS_BASE_URL` is not configured yet, the SMS falls back to a clickable Google Maps snapshot link using the latest coordinates.

## App Environment

Add this to `.env`:

```env
EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/sos-twilio-alert
EXPO_PUBLIC_SOS_CONFERENCE_WEBHOOK_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/sos-twilio-conference
EXPO_PUBLIC_SOS_BASE_URL=https://live.sos.lk
```

`EXPO_PUBLIC_SOS_BASE_URL` is optional for now, but without it the SMS contains only the latest location snapshot, not a continuously updating tracking page.

## Function Secrets

Set these in Supabase:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_twilio_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_twilio_auth_token
supabase secrets set TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
supabase secrets set TWILIO_VOICE_FROM_NUMBER=+1234567890
supabase secrets set TWILIO_TWIML_TOKEN=choose_a_long_random_string
supabase secrets set SOS_BASE_URL=https://live.sos.lk
```

If you do not use a Messaging Service, set a sender number instead:

```bash
supabase secrets set TWILIO_FROM_NUMBER=+1234567890
```

Use either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`.

For voice conference calls, set `TWILIO_VOICE_FROM_NUMBER` to a voice-capable Twilio number.
The `TWILIO_TWIML_TOKEN` secret is used to protect the TwiML URL that Twilio fetches when a guardian answers.

## Deploy

```bash
supabase functions deploy sos-twilio-alert
supabase functions deploy sos-twilio-conference
```

Keep JWT verification enabled. The app sends the current user's bearer token so the function can confirm the SOS session belongs to that user before sending SMS.
