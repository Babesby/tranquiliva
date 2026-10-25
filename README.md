# Tranquiliva

Tranquiliva is a privacy-first wellbeing platform with mood check-ins, journaling, educational resources, community spaces, therapist access, Tranquiliva AI, Know Your Brain and CauseCanvas.

## Stack

- Next.js 16 and React 19
- Firebase Authentication and Realtime Database
- Vercel-ready deployment
- Lucide icons and custom responsive styling

## Run

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Validate

```bash
npm test
```

The test command runs ESLint and a production Next.js build.

## Firebase

Enable Email/Password and Google in Firebase Authentication. Create a Realtime Database and deploy `firebase.database.rules.json`. Copy the Firebase web configuration into the matching `NEXT_PUBLIC_FIREBASE_*` variables.

Therapist accounts remain members until trusted administration assigns:

```text
users/{uid}/role = "therapist"
```

The client cannot grant itself this role.

## Deployment

Import this repository into Vercel, add the variables listed in `.env.example`, and deploy. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full launch checklist.

Server credentials for Firebase Admin, Anthropic, Paystack, SMTP and Redis must remain on the backend. Never prefix secrets with `NEXT_PUBLIC_` or commit real values.

## Data and safety

- Personal app data is synchronized to the authenticated user's Firebase path.
- Firebase rules deny access by default.
- AI and payment requests must be verified by a server that validates Firebase ID tokens.
- Tranquiliva does not present mood check-ins or assessments as diagnoses.
