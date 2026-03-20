# WhatsApp SOS Setup

This project already creates a live SOS share link and keeps updating it until the user stops SOS. The WhatsApp automation sends that link once when SOS starts.

## What Happens

1. The app starts an SOS session.
2. The app sends a POST request to `EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL`.
3. The Supabase Edge Function validates the signed-in user, loads the active SOS session and guardians, and sends one WhatsApp message per guardian.
4. The `/sos/[token]` page keeps showing the latest location until the user taps Stop SOS.

## App Environment

Add these to the root `.env` file:

```env
EXPO_PUBLIC_SOS_BASE_URL=https://your-public-web-app.example.com
EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/sos-whatsapp-alert
```

`EXPO_PUBLIC_SOS_BASE_URL` must point to the public deployment that serves `/sos/<share-token>`.

## Function Secrets

Set these as Supabase Edge Function secrets:

```bash
supabase secrets set SOS_BASE_URL=https://your-public-web-app.example.com
supabase secrets set WHATSAPP_ACCESS_TOKEN=your_meta_access_token
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
supabase secrets set WHATSAPP_API_VERSION=v23.0
```

Optional template mode:

```bash
supabase secrets set WHATSAPP_TEMPLATE_NAME=sos_live_location_alert
supabase secrets set WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

If `WHATSAPP_TEMPLATE_NAME` is not set, the function sends a normal WhatsApp text message with the tracking URL.

## Recommended Template

If you want template delivery, create a utility template whose body matches four text placeholders:

```text
{{1}} started a {{2}}.
Track live here: {{3}}
Started: {{4}}

Tracking remains live until SOS is stopped.
```

The function sends these values in order:

1. Sender name
2. SOS mode label
3. Tracking URL
4. Start time

## Deploy

Deploy the function with normal JWT verification enabled:

```bash
supabase functions deploy sos-whatsapp-alert
```

Do not use `--no-verify-jwt`. The app sends the signed-in user's bearer token so the function can verify session ownership before sending WhatsApp messages.
