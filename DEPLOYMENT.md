# Tranquiliva deployment

## 1. Firebase

1. Open Firebase Console and select the Tranquiliva project.
2. In Authentication, enable Email/Password and Google.
3. In Authentication settings, add the Vercel production domain, preview domain and final custom domain to Authorized domains.
4. Create a Realtime Database in the region closest to the primary audience.
5. Deploy `firebase.database.rules.json` from Firebase Console or with `firebase deploy --only database`.
6. Copy the Firebase web app values into the matching `NEXT_PUBLIC_FIREBASE_*` variables in Vercel.
7. Assign a verified therapist with `users/{uid}/role = "therapist"` from trusted admin tooling. The browser cannot grant this role.

## 2. GitHub and Vercel

1. Create an empty GitHub repository and push this project to its `main` branch.
2. In Vercel, create a project from that repository. Framework Preset should detect Next.js.
3. Add every value in `.env.example` to Vercel Environment Variables. Add real secrets only in Vercel, never to GitHub.
4. Set the public API URL to the deployed backend that owns Anthropic, Paystack, SMTP, Redis and Firebase Admin credentials.
5. Deploy, then add the Vercel domain to Firebase Authorized domains.

Every push to `main` creates a production deployment. Pull requests and non-production branches receive Vercel preview URLs.

## 3. Required launch checks

- Create, verify, sign in and reset a member account.
- Sign in with Google and finish onboarding.
- Refresh and verify mood, journal, AI, resource and project data restore from Firebase.
- Submit a therapist application and verify it cannot access the therapist workspace until an administrator assigns the role.
- Verify a therapist account can sign in and sign out.
- Test navigation and forms at 320, 375, 768 and 1440 pixel widths.
- Confirm the API host validates Firebase ID tokens before AI, payment or email actions.
- Complete Paystack test transactions and webhook signature tests before enabling live keys.
- Run `npm test` before merging to `main`.
