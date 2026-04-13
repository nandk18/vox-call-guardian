# Vox — Technical Guide

## Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Lovable (deployment)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Realtime)
- **Voice AI**: Bolna AI (agent orchestration, telephony via Twilio)
- **Transcription**: Deepgram nova-3 (English), Sarvam saaras:v2.5 (Indian languages)
- **TTS**: ElevenLabs eleven_turbo_v2_5 (Nila female / Vikram male)
- **LLM**: OpenAI gpt-4o-mini (via Bolna hosted)
- **AI Analysis**: Claude Haiku (transcript analysis in webhook)
- **Email**: Resend (from noreply@tushietrials.ca)
- **SMS**: MSG91 (requires DLT registration)
- **Notifications**: Zapier webhook (dynamic per agent from integrations table) → Google Sheets
- **Scheduling**: Cal.com v1 (via Bolna native tools)

## Database Schema (Supabase)

### agents
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Auth user ref |
| business_name | text | Business name |
| industry | text | Business type |
| language_primary | text | Agent language |
| voice | text | male/female |
| greeting | text | Welcome message |
| bolna_agent_id | text | Bolna agent ref |
| bolna_phone_number_id | text | Bolna number ID |
| vox_number | text | Assigned number |
| owner_whatsapp | text | WhatsApp number |
| owner_mobile | text | SMS number |
| status | text | active/inactive |
| plan | text | trial/unlimited |
| trial_ends_at | timestamptz | Trial expiry |
| onboarding_complete | boolean | Setup done |
| compiled_prompt | text | Agent prompt |
| last_rebuilt_language | text | Last rebuild lang |
| last_rebuilt_voice | text | Last rebuild voice |
| notification_email | boolean | Email on/off |
| notification_whatsapp | boolean | WA on/off |
| notification_sms | boolean | SMS on/off |

### knowledge
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_id | uuid | Agent ref |
| faq | text | FAQs |
| services | text | Services offered |
| hours | text | Business hours |
| address | text | Location |
| extra_notes | text | Extra info |

### calls
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_id | uuid | Agent ref |
| bolna_call_id | text | Unique per call |
| caller_number | text | Caller phone |
| caller_name | text | Extracted name |
| caller_need | text | What they need |
| caller_urgency | text | high/medium/low |
| duration_secs | integer | Call duration |
| outcome | text | answered/missed |
| transcript | jsonb | Full transcript |
| summary | text | AI summary |
| recording_url | text | Audio recording |
| is_read | boolean | Read status |
| notification_sent | boolean | Notif sent |

### integrations
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_id | uuid | Agent ref |
| type | text | calcom/zapier etc |
| api_key | text | Integration key |
| event_type_id | text | Cal.com event |
| event_type_name | text | Event name |
| timezone | text | Default IST |
| is_active | boolean | Active status |

## Edge Functions

### create-bolna-agent
**Trigger**: Rebuild Agent button
**Does**:
- Reads agent + knowledge from Supabase
- Compiles system prompt
- Creates Bolna agent via API
- Links phone number
- Adds Cal.com tools if connected (native v1 format)
- Updates agents table with bolna_agent_id

### update-bolna-agent
**Trigger**: Any save on Agent page
**Does**:
- PATCH Bolna agent with new prompt
- PATCH synthesizer for voice changes
- Updates compiled_prompt in Supabase
- Note: Language changes need rebuild

### handle-call-webhook
**Trigger**: POST from Bolna after call
**Does**:
- Deduplicates by bolna_call_id
- Gets caller number from telephony_data.from_number
- Parses transcript string to array
- Calls Claude Haiku to analyze transcript and extract: caller_name, caller_need, urgency, preferred_time, summary
- Inserts call record to Supabase
- Triggers send-call-summary

### send-call-summary
**Trigger**: Called by handle-call-webhook
**Does**:
- Sends email via Resend
- Sends SMS via MSG91
- Posts to Zapier webhook
- Marks notification_sent = true

### fetch-calcom-events
**Trigger**: Frontend Cal.com connect modal
**Does**:
- Calls Cal.com v2 event-types API server-side to avoid CORS
- Returns event list to frontend

### update-webhook
**Trigger**: Settings → Fix Webhook button
**Does**:
- PATCHes Bolna agent webhook_url
- Verifies webhook is set correctly

### resend-summary
**Trigger**: Inbox Resend button
**Does**:
- Re-triggers send-call-summary for a specific call

### razorpay-webhook
**Trigger**: Razorpay payment events
**Does**:
- Verifies webhook signature
- Updates agent plan/status

## Key API Integrations

### Bolna AI
- Base URL: https://api.bolna.ai
- Auth: Bearer token (BOLNA_API_KEY)
- Create agent: POST /v2/agent
- Update agent: PATCH /v2/agent/:id
- Link number: POST /inbound/setup
- Webhook events: completed, call-disconnected

### Cal.com
- Bolna native tools use Cal.com v1 API
- apiKey passed as query param
- Slots: GET /v1/slots
- Bookings: POST /v1/bookings

### Resend
- From: noreply@tushietrials.ca
- Domain verified: tushietrials.ca

### MSG91
- SMS route 4 (transactional)
- Sender ID: VOXAI
- Note: Requires DLT registration for delivery in India

### Zapier
- Webhook: hooks.zapier.com/hooks/catch/26174803/u7lsamc/
- Payload fields: date_time, caller_number, caller_name, duration_secs, outcome, caller_need, urgency, summary, business_name, recording_url

## Environment Variables (Supabase)
| Variable | Purpose |
|----------|---------|
| BOLNA_API_KEY | Bolna API auth |
| BOLNA_API_URL | https://api.bolna.ai |
| RESEND_API_KEY | Email sending |
| MSG91_AUTH_KEY | SMS sending |
| MSG91_SENDER_ID | VOXAI |
| ANTHROPIC_API_KEY | Transcript analysis |
| ADMIN_EMAIL | Alert emails |
| VOX_APP_URL | App URL for links |

## Phone Number Details
- Vox number: +16813033721 (US, Bolna)
- Bolna phone ID: 58cf9c77-e784-423f-9cb5-48bcf655fe25
- Note: Indian numbers require GST + CIN compliance docs on Bolna

## Known Issues & Pending Items
1. Cal.com booking: Bolna native Cal.com tool uses v1 (deprecated). Waiting for Bolna to migrate to v2. When fixed: just rebuild agent.
2. WhatsApp: MSG91 requires pre-approved templates. Not yet configured.
3. SMS DLT: VOXAI sender ID needs DLT registration for India delivery.
4. Razorpay: KYC required for payments. Currently using test keys only.

## Adding New Features
When adding any new feature, update both /docs/USER_GUIDE.md and /docs/TECHNICAL_GUIDE.md to reflect the change.

---
*Last updated: April 2026*
*Stack: React + Supabase + Bolna AI*
