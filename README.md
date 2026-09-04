# Punisher 4.0 - Telegram Moderation Bot

A high-performance Telegram moderation bot running as a Firebase Cloud Function
(Gen 2) with Firestore. It utilizes a hybrid spam detection pipeline combining
local vector database similarity search and structured Gemini LLM reasoning.

---

## Prerequisites

Before deployment, ensure you have:

1. A Firebase project created on the Blaze (pay-as-you-go) plan.
2. A Telegram Bot token from [@BotFather](https://t.me/BotFather).
3. A Gemini API Key from Google AI Studio.
4. The Firebase CLI installed and authenticated (`firebase login`).

---

## Configuration & Secrets

Punisher 4.0 secures sensitive API tokens using Google Cloud Secret Manager,
integrated directly via Firebase Cloud Functions secrets.

Configure the secrets in your active Firebase project before deploying:

```bash
# Set your Telegram Bot API token
firebase functions:secrets:set TG_BOT_KEY="your-telegram-bot-token"

# Set your Google Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY="your-gemini-api-key"
```

---

## Local Development

You can run the codebase inside the Firebase Emulator Suite locally:

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run emulators**:
   ```bash
   npm run dev
   ```

---

## Firestore Setup

The hybrid pipeline relies on a Firestore vector index to run fast cosine
similarity lookups against registered spam signatures.

Create a vector index in the Firestore console under the **Indexes** tab:

- **Collection ID**: `spam`
- **Field**: `textEmbeddings`
- **Dimension**: `768` (dimension of Google's `text-embedding-004` model)
- **Distance Measure**: `COSINE`

---

## Deployment

To compile TypeScript and deploy the Firebase Cloud Function:

```bash
# Compile and deploy
npm run build && npm run deploy
```

Once deployment completes, Firebase will return a trigger URL for the
`punisher` function:
`https://punisher-<project-id>.<region>.cloudfunctions.net/punisher`

---

## Webhook Setup

Telegram expects you to register your Cloud Function URL as the webhook handler.
Submit an HTTP POST or GET request to the Telegram Webhook API:

```bash
curl -X POST "https://api.telegram.org/bot<TG_BOT_KEY>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://punisher-<project-id>.<region>.cloudfunctions.net/punisher"}'
```

---

## Commands Reference

- `/spam` (Reply to message): Flags a message. Admins immediately ban/delete;
  regular users forward the post to the admin team for an inline vote.
- `/promote` (Reply to message): Promotes the replied user to a bot admin.
- `/stats`: Generates chat statistics (processed posts, blocks, deletions).
- `/ua`: Configures chat language to Ukrainian.
- `/en`: Configures chat language to English.
