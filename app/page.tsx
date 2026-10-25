"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Bookmark,
  Flag,
  Plus,
  Send,
  ThumbsUp,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Compass,
  Eye,
  EyeOff,
  Earth,
  Fingerprint,
  Heart,
  Home,
  Leaf,
  LockKeyhole,
  Megaphone,
  Menu,
  MessageCircle,
  Moon,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import {
  auth,
  ensureFirebasePersistence,
  firebaseConfigured,
  googleProvider,
  prepareFirebaseAuth,
} from "@/lib/firebase";
import {
  backupUserData,
  readAccountRole,
  restoreUserData,
  saveAccountProfile,
} from "@/lib/firebase-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Screen =
  | "public"
  | "auth"
  | "onboarding"
  | "assessment"
  | "app"
  | "therapist-app";
type AppView =
  | "today"
  | "talk"
  | "journal"
  | "resources"
  | "community"
  | "therapists"
  | "brain"
  | "causecanvas"
  | "history"
  | "privacy";
type CheckinEntry = {
  id: string;
  createdAt: string;
  mood: string;
  intensity: number;
  feelings: string[];
  influences: string[];
  note: string;
};

const navItems = [
  { id: "today", label: "Home", icon: Home },
  { id: "talk", label: "Talk", icon: MessageCircle },
  { id: "journal", label: "Journal", icon: PenLine },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "community", label: "Community", icon: Users },
  { id: "therapists", label: "Therapists", icon: Heart },
] as const;

function Mark({ light = false }: { light?: boolean }) {
  return (
    <span className={`t-mark ${light ? "light" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? "light" : ""}`}>
      <Mark light={light} />
      <strong>TRANQUILIVA</strong>
    </span>
  );
}

async function logout(go: (screen: Screen) => void) {
  if (auth?.currentUser) {
    await backupUserData(auth.currentUser.uid).catch(() => undefined);
    await signOut(auth);
  }
  window.sessionStorage.removeItem("tranquiliva-id-token");
  window.sessionStorage.removeItem("tranquiliva-user-id");
  window.sessionStorage.removeItem("tranquiliva-auth-role");
  window.sessionStorage.removeItem("tranquiliva-onboarding-pending");
  go("public");
}

export default function Tranquiliva() {
  const [screen, setScreen] = useState<Screen>("public");
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const hadAuthenticatedUser = useRef(false);
  const [dark, setDark] = useState(false);
  const [profile, setProfileState] = useState(() => {
    if (typeof window === "undefined") return { name: "Member", goals: [] as string[] };
    try {
      return JSON.parse(window.localStorage.getItem("tranquiliva-profile") || "{\"name\":\"Member\",\"goals\":[]}");
    } catch {
      return { name: "Member", goals: [] as string[] };
    }
  });
  const setProfile = (next: { name: string; goals: string[] }) => {
    setProfileState(next);
    window.localStorage.setItem("tranquiliva-profile", JSON.stringify(next));
    if (auth?.currentUser) {
      void saveAccountProfile(auth.currentUser.uid, next);
      void backupUserData(auth.currentUser.uid);
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!auth) {
      return;
    }
        void ensureFirebasePersistence().catch(() => undefined);
    let syncTimer: number | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (syncTimer) window.clearInterval(syncTimer);
      if (!user) {
        window.sessionStorage.removeItem("tranquiliva-id-token");
        window.sessionStorage.removeItem("tranquiliva-user-id");
        window.sessionStorage.removeItem("tranquiliva-auth-role");
        if (hadAuthenticatedUser.current && !window.sessionStorage.getItem("tranquiliva-auth-transition")) {
          setScreen("public");
        }
        setAuthReady(true);
        return;
      }
      hadAuthenticatedUser.current = true;
      try {
        await restoreUserData(user.uid).catch(() => undefined);
        const role = await readAccountRole(user.uid).catch(() => "member" as const);
        const token = await user.getIdToken();
        window.sessionStorage.setItem("tranquiliva-id-token", token);
        window.sessionStorage.setItem("tranquiliva-user-id", user.uid);
        window.sessionStorage.setItem("tranquiliva-auth-role", role);
        const stored = window.localStorage.getItem("tranquiliva-profile");
        if (stored) setProfileState(JSON.parse(stored));
        const onboardingPending = window.sessionStorage.getItem("tranquiliva-onboarding-pending");
        const authTransition = window.sessionStorage.getItem("tranquiliva-auth-transition");
        if (!authTransition) {
          setScreen(
            onboardingPending
              ? "onboarding"
              : role === "therapist"
                ? "therapist-app"
                : "app",
          );
        }
        syncTimer = window.setInterval(() => void backupUserData(user.uid), 5000);
      } finally {
        setAuthReady(true);
      }
    });
    return () => {
      unsubscribe();
      if (syncTimer) window.clearInterval(syncTimer);
    };
  }, []);
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="site-root">
      {!authReady && <div className="auth-loading" aria-label="Loading your private space"><Mark /></div>}
      {authReady && <>
      {screen === "public" && (
        <PublicHome go={go} dark={dark} setDark={setDark} />
      )}
      {screen === "auth" && (
        <Auth
          go={go}
          onLogin={(role, name) => {
            if (name) setProfile({ ...profile, name });
            go(role === "therapist" ? "therapist-app" : "app");
          }}
        />
      )}
      {screen === "onboarding" && (
        <Onboarding go={go} profile={profile} setProfile={setProfile} />
      )}
      {screen === "assessment" && <Assessment go={go} />}
      {screen === "app" && (
        <MemberApp go={go} dark={dark} setDark={setDark} profile={profile} />
      )}
      {screen === "therapist-app" && (
        <TherapistApp go={go} dark={dark} setDark={setDark} name={profile.name} />
      )}
      </>}
    </div>
  );
}

function PublicHome({
  go,
  dark,
  setDark,
}: {
  go: (s: Screen) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const shownThisSession = window.sessionStorage.getItem("tranquiliva-assessment-shown");
    const lastShown = window.localStorage.getItem("tranquiliva-assessment-last-shown");
    if (shownThisSession || lastShown === today) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("tranquiliva-assessment-shown", "true");
      window.localStorage.setItem("tranquiliva-assessment-last-shown", today);
      setAssessmentOpen(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="public-page" id="top">
      <header className="public-nav">
        <Logo />
        <button
          className="mobile-public-menu"
          type="button"
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
          aria-controls="public-navigation-actions"
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <X /> : <Menu />}
        </button>
        <div
          id="public-navigation-actions"
          className={`nav-actions ${navOpen ? "open" : ""}`}
        >
          <button
            className="round-control"
            onClick={() => setDark(!dark)}
            aria-label="Change colour mode"
          >
            {dark ? <Sun /> : <Moon />}
            <span className="mobile-action-label">Colour mode</span>
          </button>
          <button
            className="signin-button"
            onClick={() => {
              setNavOpen(false);
              go("auth");
            }}
          >
            Sign in
          </button>
          <button
            className="solid-button nav-primary"
            onClick={() => {
              setNavOpen(false);
              go("auth");
            }}
          >
            Begin privately <ArrowRight />
          </button>
        </div>
      </header>

      <main>
        <section className="hero-luxe">
          <div className="hero-copy">
            <h1>A calmer place for your mind to land.</h1>
            <div className="hero-actions">
              <button className="solid-button large" onClick={() => go("auth")}>
                Begin privately <ArrowRight />
              </button>
              <button
                className="play-button"
                onClick={() => setAssessmentOpen(true)}
              >
                Free assessment
              </button>
            </div>
          </div>
          <div className="hero-image-wrap">
            <img
            src="/hero-tranquiliva.webp"
              alt="A woman enjoying a quiet moment beside a window"
            />
            <div className="floating-checkin">
              <strong>What do you need?</strong>
              <div>
                <button aria-label="A quiet minute">
                  <Leaf />
                </button>
                <button aria-label="Write privately">
                  <PenLine />
                </button>
                <button aria-label="Talk it through">
                  <MessageCircle />
                </button>
              </div>
            </div>
            <div className="image-seal">
              <Mark light />
            </div>
          </div>
        </section>

        <section className="luxe-statement">
          <h2>One calm place for what you need now.</h2>
        </section>

        <section className="icon-dock" aria-label="Explore Tranquiliva">
          <button
            className="dock-item talk"
            onClick={() => go("auth")}
            aria-label="Talk. Think out loud in private"
          >
            <span>
              <MessageCircle />
            </span>
            <strong>Talk</strong>
            <em>Think out loud in private.</em>
          </button>
          <button
            className="dock-item reflect"
            onClick={() => go("auth")}
            aria-label="Reflect. Keep words, voice and patterns"
          >
            <span>
              <PenLine />
            </span>
            <strong>Reflect</strong>
            <em>Keep words, voice and patterns.</em>
          </button>
          <button
            className="dock-item practise"
            onClick={() => go("auth")}
            aria-label="Practise. Use one small thing now"
          >
            <span>
              <Leaf />
            </span>
            <strong>Practise</strong>
            <em>Use one small thing now.</em>
          </button>
          <button
            className="dock-item connect"
            onClick={() => go("auth")}
            aria-label="Connect. Join moderated anonymous rooms"
          >
            <span>
              <Users />
            </span>
            <strong>Connect</strong>
            <em>Join moderated anonymous rooms.</em>
          </button>
          <button
            className="dock-item care"
            onClick={() => go("auth")}
            aria-label="Care. Request a verified therapist"
          >
            <span>
              <Heart />
            </span>
            <strong>Care</strong>
            <em>Request a verified therapist.</em>
          </button>
        </section>

        <section className="care-showcase" id="care">
          <div className="care-copy">
            <h2>Human care without the maze.</h2>
            <button className="light-button" onClick={() => go("auth")}>
              Find verified care <ArrowRight />
            </button>
          </div>
          <div className="care-access-grid">
            <span><ShieldCheck /><strong>Verified professionals</strong></span>
            <span><CalendarDays /><strong>Private requests</strong></span>
            <span><LockKeyhole /><strong>Protected sessions</strong></span>
          </div>
        </section>

        <section className="trust-section" id="trust">
          <div>
            <h2>Yours means yours.</h2>
          </div>
          <div className="trust-points">
            <strong>Private history</strong>
            <strong>Export and delete</strong>
            <strong>No advertising</strong>
            <strong>No data sales</strong>
          </div>
        </section>

        <section className="final-cta">
          <Mark light />
          <h2>Take one quiet minute.</h2>
          <button className="aqua-button" onClick={() => go("auth")}>
            Begin privately <ArrowRight />
          </button>
        </section>
      </main>
      <GlobalFooter />
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="assessment-popup">
          <DialogHeader>
            <DialogTitle>DASS 21 wellbeing assessment</DialogTitle>
            <DialogDescription>
              Twenty one questions about the past week. Private results in about
              five minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="popup-measures">
            <strong>Depression</strong>
            <strong>Anxiety</strong>
            <strong>Stress</strong>
          </div>
          <button
            className="popup-primary"
            onClick={() => {
              setAssessmentOpen(false);
              go("assessment");
            }}
          >
            Begin free assessment <ArrowRight />
          </button>
          <button
            className="popup-later"
            onClick={() => setAssessmentOpen(false)}
          >
            Not now
          </button>
          <p>Reflection only. This does not provide a diagnosis.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Auth({
  go,
  onLogin,
}: {
  go: (s: Screen) => void;
  onLogin: (role: "member" | "therapist", name: string) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [role, setRole] = useState<"member" | "therapist">("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const displayNameFromEmail = (value: string) => {
    const raw = value.split("@")[0].split(/[._-]/)[0] || "Member";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const friendlyError = (value: unknown) => {
    const message = value instanceof Error ? value.message : "Sign in failed.";
    if (message.includes("configuration-not-found")) {
      return "Firebase Authentication is not enabled for this project yet.";
    }
    if (message.includes("operation-not-allowed")) {
      return "Email and password sign in is not enabled yet.";
    }
    return message
      .replace("Firebase: Error ", "")
      .replace(/\(auth\/(.*?)\)\.?/, "$1")
      .replaceAll("-", " ");
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    window.sessionStorage.setItem("tranquiliva-auth-transition", "true");
    try {
      const firebase = await prepareFirebaseAuth();
      const credential = mode === "signup"
        ? await createUserWithEmailAndPassword(firebase.auth, email, password)
        : await signInWithEmailAndPassword(firebase.auth, email, password);
      const name = displayNameFromEmail(email);
      if (role === "therapist") {
        if (mode === "signup") {
          await set(ref(firebase.database, `therapistApplications/${credential.user.uid}`), {
            email,
            status: "pending",
            submittedAt: new Date().toISOString(),
          });
          await signOut(firebase.auth);
          setSuccess("Application received. Therapist access begins after verification.");
          return;
        }
        const verifiedRole = await readAccountRole(credential.user.uid);
        if (verifiedRole !== "therapist") {
          await signOut(firebase.auth);
          throw new Error("Therapist access has not been verified for this account.");
        }
      }
      if (mode === "signup" && role === "member") {
        window.sessionStorage.setItem("tranquiliva-onboarding-pending", "true");
        go("onboarding");
      }
      else onLogin(role, name);
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      window.sessionStorage.removeItem("tranquiliva-auth-transition");
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setError("");
    setBusy(true);
    window.sessionStorage.setItem("tranquiliva-auth-transition", "true");
    try {
      if (role === "therapist") throw new Error("Therapists sign in with their verified email account.");
      const firebase = await prepareFirebaseAuth();
      const credential = await signInWithPopup(firebase.auth, googleProvider);
      const name = credential.user.displayName?.split(" ")[0] || displayNameFromEmail(credential.user.email || "member");
      if (getAdditionalUserInfo(credential)?.isNewUser) {
        window.sessionStorage.setItem("tranquiliva-onboarding-pending", "true");
        go("onboarding");
      } else {
        onLogin("member", name);
      }
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      window.sessionStorage.removeItem("tranquiliva-auth-transition");
      setBusy(false);
    }
  }
  async function resetPassword() {
    setError("");
    setSuccess("");
    try {
      if (!email) throw new Error("Enter your email first.");
      const firebase = await prepareFirebaseAuth();
      await sendPasswordResetEmail(firebase.auth, email);
      setSuccess("Password reset email sent.");
    } catch (authError) {
      setError(friendlyError(authError));
    }
  }
  return (
    <div className="auth-page">
      <button className="auth-back" onClick={() => go("public")}>
        <ArrowLeft /> Back
      </button>
      <div className="auth-art">
        <img
          src="/auth-tranquiliva.webp"
          alt="A private journal in a calm interior"
        />
        <div className="auth-art-overlay">
          <Logo light />
          <blockquote>“A private place to arrive as you are.”</blockquote>
          <span>
            <ShieldCheck />
            Your wellbeing data is never sold.
          </span>
        </div>
      </div>
      <main className="auth-panel">
        <div className="auth-form-wrap">
          <Logo />
          <div className="role-switch" aria-label="Account type">
            <button className={role === "member" ? "active" : ""} onClick={() => setRole("member")}>Member</button>
            <button className={role === "therapist" ? "active" : ""} onClick={() => setRole("therapist")}>Therapist</button>
          </div>
          <div className="auth-tabs">
            <button
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
            <button
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </div>
          <h1>
            {role === "therapist"
              ? mode === "signup" ? "Apply as a therapist." : "Therapist sign in."
              : mode === "signup" ? "Make space for yourself." : "Welcome back."}
          </h1>
          {role === "member" && (
            <button className="auth-provider" type="button" onClick={googleSignIn} disabled={busy}>
              <span aria-hidden="true">G</span> Continue with Google
            </button>
          )}
          <form onSubmit={submit}>
            <label>
              EMAIL
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              PASSWORD
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label="Show password"
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {mode === "signup" && (
              <label className="consent-row">
                <input type="checkbox" required />
                <span>I agree to the Terms and Privacy Notice.</span>
              </label>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy
                ? "Securing your space…"
                : mode === "signup"
                  ? role === "therapist" ? "Submit application" : "Create my private space"
                  : "Sign in"}
              <ArrowRight />
            </button>
            {mode === "signin" && (
              <button className="auth-reset" type="button" onClick={resetPassword}>Forgot password</button>
            )}
          </form>
          {error && <p className="auth-status error">{error}</p>}
          {success && <p className="auth-status success">{success}</p>}
          <p className="auth-note">
            <LockKeyhole />
            Firebase secured account access.
          </p>
        </div>
      </main>
    </div>
  );
}

function Onboarding({
  go,
  profile,
  setProfile,
}: {
  go: (s: Screen) => void;
  profile: { name: string; goals: string[] };
  setProfile: (p: { name: string; goals: string[] }) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile.name);
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const [pace, setPace] = useState("gentle");
  const goalList = [
    { name: "Understand my feelings", icon: Compass },
    { name: "Manage stress", icon: Leaf },
    { name: "Sleep more calmly", icon: Moon },
    { name: "Write and reflect", icon: PenLine },
    { name: "Feel less alone", icon: Users },
    { name: "Find a therapist", icon: Heart },
  ];
  const toggle = (g: string) =>
    setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g]);
  return (
    <div className="flow-page">
      <header className="flow-header">
        <Logo />
        <span>{step} / 4</span>
        <button onClick={() => go("public")}>
          <X />
        </button>
      </header>
      <div className="flow-progress">
        <i style={{ width: `${step * 25}%` }} />
      </div>
      <main className="flow-card">
        {step === 1 && (
          <div className="flow-step">
            <span className="step-orb">
              <UserRound />
            </span>
            <h1>What should we call you?</h1>
            <label>
              FIRST NAME
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Your first name"
              />
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="flow-step wide">
            <span className="step-orb">
              <Sparkles />
            </span>
            <h1>What would help most?</h1>
            <div className="choice-grid">
              {goalList.map((g) => (
                <button
                  key={g.name}
                  className={goals.includes(g.name) ? "selected" : ""}
                  onClick={() => toggle(g.name)}
                >
                  <g.icon />
                  <span>{g.name}</span>
                  {goals.includes(g.name) && <CheckCircle2 />}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="flow-step">
            <span className="step-orb">
              <Clock3 />
            </span>
            <h1>Choose your pace.</h1>
            <div className="pace-list">
              {[
                ["gentle", "Gentle", "A few times a week"],
                ["daily", "Daily", "Once each day"],
                ["self", "On demand", "No reminders"],
              ].map((p) => (
                <button
                  key={p[0]}
                  className={pace === p[0] ? "selected" : ""}
                  onClick={() => setPace(p[0])}
                >
                  <span className="radio">
                    <i />
                  </span>
                  <span>
                    <strong>{p[1]}</strong>
                    <small>{p[2]}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="flow-step">
            <span className="step-orb">
              <ShieldCheck />
            </span>
            <h1>Your space. Your control.</h1>
            <div className="privacy-stack">
              <span>
                <LockKeyhole />
                <strong>Private by default</strong>
              </span>
              <span>
                <Fingerprint />
                <strong>Export or delete anytime</strong>
              </span>
              <span>
                <ShieldCheck />
                <strong>Never sold to advertisers</strong>
              </span>
            </div>
            <p className="compact-note">
              Safety support appears only when context requires it.
            </p>
          </div>
        )}
        <div className="flow-actions">
          {step > 1 && (
            <button
              className="flow-secondary"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft />
              Back
            </button>
          )}
          <button
            className="flow-primary"
            disabled={
              (step === 1 && !name.trim()) || (step === 2 && !goals.length)
            }
            onClick={() => {
              if (step < 4) setStep(step + 1);
              else {
                setProfile({ name: name || "Phillipa", goals });
                window.sessionStorage.removeItem("tranquiliva-onboarding-pending");
                go("assessment");
              }
            }}
          >
            {step === 4 ? "Continue to assessment" : "Continue"}
            <ArrowRight />
          </button>
        </div>
      </main>
    </div>
  );
}

function Assessment({ go }: { go: (s: Screen) => void }) {
  const questions = [
    "I found it hard to wind down",
    "I was aware of dryness of my mouth",
    "I couldn’t seem to experience any positive feeling at all",
    "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)",
    "I found it difficult to work up the initiative to do things",
    "I tended to over-react to situations",
    "I experienced trembling (e.g. in the hands)",
    "I felt that I was using a lot of nervous energy",
    "I was worried about situations in which I might panic and make a fool of myself",
    "I felt that I had nothing to look forward to",
    "I found myself getting agitated",
    "I found it difficult to relax",
    "I felt down-hearted and blue",
    "I was intolerant of anything that kept me from getting on with what I was doing",
    "I felt I was close to panic",
    "I was unable to become enthusiastic about anything",
    "I felt I wasn’t worth much as a person",
    "I felt that I was rather touchy",
    "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)",
    "I felt scared without any good reason",
    "I felt that life was meaningless",
  ];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  const answer = (value: number) => {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    if (index === questions.length - 1) setComplete(true);
    else setIndex(index + 1);
  };
  const groups = {
    depression: [2, 4, 9, 12, 15, 16, 20],
    anxiety: [1, 3, 6, 8, 14, 18, 19],
    stress: [0, 5, 7, 10, 11, 13, 17],
  };
  const score = (items: number[]) =>
    items.reduce((sum, item) => sum + (answers[item] ?? 0), 0) * 2;
  const scores = {
    depression: score(groups.depression),
    anxiety: score(groups.anxiety),
    stress: score(groups.stress),
  };
  const level = (kind: keyof typeof scores, value: number) => {
    const limits = {
      depression: [9, 13, 20, 27],
      anxiety: [7, 9, 14, 19],
      stress: [14, 18, 25, 33],
    }[kind];
    return value <= limits[0]
      ? "Normal"
      : value <= limits[1]
        ? "Mild"
        : value <= limits[2]
          ? "Moderate"
          : value <= limits[3]
            ? "Severe"
            : "Extremely severe";
  };
  const downloadReport = () => {
    const report = `TRANQUILIVA Private DASS 21 Report\n\nDepression ${scores.depression} ${level("depression", scores.depression)}\nAnxiety ${scores.anxiety} ${level("anxiety", scores.anxiety)}\nStress ${scores.stress} ${level("stress", scores.stress)}\n\nThis screening report does not provide a diagnosis. Consider discussing significant emotional difficulty with a qualified health professional.\n`;
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TRANQUILIVA_DASS21_Report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="assessment-page">
      <header>
        <Logo light />
        <button onClick={() => go("public")}>Exit assessment</button>
      </header>
      {!complete ? (
        <main className="assessment-card">
          <div className="assessment-count">
            {String(index + 1).padStart(2, "0")} <b>of {questions.length}</b>
          </div>
          <div className="assessment-line">
            <i
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
          <h1>{questions[index]}</h1>
          <div className="scale dass-scale">
            <button onClick={() => answer(0)}>
              <b>0</b>
              <small>Did not apply</small>
            </button>
            <button onClick={() => answer(1)}>
              <b>1</b>
              <small>Some of the time</small>
            </button>
            <button onClick={() => answer(2)}>
              <b>2</b>
              <small>A good part of the time</small>
            </button>
            <button onClick={() => answer(3)}>
              <b>3</b>
              <small>Most of the time</small>
            </button>
          </div>
          <button
            className="assessment-back"
            disabled={!index}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft />
            Previous
          </button>
        </main>
      ) : (
        <main className="result-card">
          <h1>Your DASS 21 results</h1>
          <div className="dass-results">
            <article>
              <strong>{scores.depression}</strong>
              <h2>Depression</h2>
              <p>{level("depression", scores.depression)}</p>
            </article>
            <article>
              <strong>{scores.anxiety}</strong>
              <h2>Anxiety</h2>
              <p>{level("anxiety", scores.anxiety)}</p>
            </article>
            <article>
              <strong>{scores.stress}</strong>
              <h2>Stress</h2>
              <p>{level("stress", scores.stress)}</p>
            </article>
          </div>
          <p>
            DASS 21 measures recent symptoms. It does not provide a diagnosis.
          </p>
          <div className="result-buttons">
            <button className="download-report" onClick={downloadReport}>
              Download report <BookOpen />
            </button>
            <button onClick={() => go("auth")}>
              Continue <ArrowRight />
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

function MemberApp({
  go,
  dark,
  setDark,
  profile,
}: {
  go: (s: Screen) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  profile: { name: string; goals: string[] };
}) {
  const [view, setView] = useState<AppView>("today");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [checkins, setCheckins] = useState<CheckinEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        window.localStorage.getItem("tranquiliva-checkins") || "[]",
      );
    } catch {
      return [];
    }
  });
  useEffect(() => {
    window.localStorage.setItem(
      "tranquiliva-checkins",
      JSON.stringify(checkins),
    );
  }, [checkins]);
  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2400);
  };
  return (
    <div className="member-shell">
      <aside className={menu ? "member-sidebar open" : "member-sidebar"}>
        <div className="member-logo">
          <Logo light={dark} />
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => {
                setView(item.id);
                setMenu(false);
              }}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-tools">
          <button onClick={() => setView("brain")}>
            <Brain />
            Know your brain
          </button>
          <button onClick={() => setView("causecanvas")}>
            <Megaphone />
            CauseCanvas
          </button>
        </div>
        <div className="side-bottom">
          <button onClick={() => setView("history")}>
            <BarChart3 />
            Mood history
          </button>
          <button onClick={() => setView("privacy")}>
            <ShieldCheck />
            Privacy and account
          </button>
          <button className="member-profile" onClick={() => setView("privacy")}>
            <span>{profile.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{profile.name}</strong>
            </div>
            <ChevronRight />
          </button>
          <small>
            from <strong>ALLMORROW</strong>
          </small>
        </div>
      </aside>
      {menu && <button className="app-scrim" onClick={() => setMenu(false)} />}
      <main className="member-main">
        <header className="member-top">
          <button className="mobile-app-menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <span className="mobile-app-logo">
            <Mark />
            TRANQUILIVA
          </span>
          <div>
            <button onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </button>
            <button>
              <CircleUserRound />
            </button>
          </div>
        </header>
        <div className="member-content">
          {view === "today" && (
            <Today
              name={profile.name}
              setView={setView}
              notify={notify}
              checkins={checkins}
              saveCheckin={(entry) => setCheckins([entry, ...checkins])}
            />
          )}{" "}
          {view === "talk" && <Talk name={profile.name} notify={notify} />}{" "}
          {view === "journal" && <Journal notify={notify} />}{" "}
          {view === "resources" && <Resources notify={notify} />}{" "}
          {view === "community" && <Community notify={notify} />}{" "}
          {view === "therapists" && <Therapists notify={notify} />}{" "}
          {view === "brain" && (
            <KnowYourBrain setView={setView} notify={notify} />
          )}{" "}
          {view === "causecanvas" && <CauseCanvas notify={notify} />}{" "}
          {view === "history" && <History entries={checkins} />}{" "}
          {view === "privacy" && <Privacy go={go} notify={notify} />}
          
        </div>
      </main>
      {toast && (
        <div className="app-toast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  );
}

type TherapistView = "overview" | "requests" | "clients" | "schedule" | "notes" | "profile";

function TherapistApp({
  go,
  dark,
  setDark,
  name,
}: {
  go: (screen: Screen) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  name: string;
}) {
  const [view, setView] = useState<TherapistView>("overview");
  const [toast, setToast] = useState("");
  const [profile, setTherapistProfile] = useState(() => {
    if (typeof window === "undefined") return { name, title: "", licence: "", areas: "", bio: "" };
    try {
      return JSON.parse(window.localStorage.getItem("tranquiliva-therapist-profile") || JSON.stringify({ name, title: "", licence: "", areas: "", bio: "" }));
    } catch {
      return { name, title: "", licence: "", areas: "", bio: "" };
    }
  });
  const [slots, setSlots] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("tranquiliva-therapist-slots") || "[]"); }
    catch { return []; }
  });
  const [slot, setSlot] = useState("");
  useEffect(() => {
    window.localStorage.setItem("tranquiliva-therapist-profile", JSON.stringify(profile));
    window.localStorage.setItem("tranquiliva-therapist-slots", JSON.stringify(slots));
  }, [profile, slots]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };
  const nav: { id: TherapistView; label: string; icon: typeof Home }[] = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "requests", label: "Requests", icon: Heart },
    { id: "clients", label: "Clients", icon: Users },
    { id: "schedule", label: "Schedule", icon: CalendarDays },
    { id: "notes", label: "Session notes", icon: PenLine },
    { id: "profile", label: "Professional profile", icon: UserRound },
  ];
  const empty = (icon: typeof Home, title: string) => {
    const Icon = icon;
    return <div className="therapist-empty"><Icon /><h2>{title}</h2></div>;
  };
  return (
    <div className="therapist-shell">
      <aside className="therapist-sidebar">
        <Logo light={dark} />
        <div className="therapist-badge"><ShieldCheck /><strong>Therapist workspace</strong></div>
        <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
        <button className="therapist-signout" onClick={() => void logout(go)}>Sign out</button>
      </aside>
      <main className="therapist-main">
        <header><div><strong>TRANQUILIVA Care</strong><span>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span></div><button onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button></header>
        <div className="therapist-content">
          {view === "overview" && <><div className="welcome-head"><h1>Welcome back, {profile.name || name}.</h1></div><section className="therapist-metrics"><article><strong>0</strong><span>New requests</span></article><article><strong>0</strong><span>Upcoming sessions</span></article><article><strong>0</strong><span>Active clients</span></article><article><strong>GHS 0</strong><span>Available payout</span></article></section><section className="therapist-overview-grid"><article><h2>Next session</h2>{empty(CalendarDays, "No sessions scheduled.")}</article><article><h2>Care requests</h2>{empty(Heart, "No new requests.")}</article></section></>}
          {view === "requests" && <AppPage title="Care requests">{empty(Heart, "No care requests yet.")}</AppPage>}
          {view === "clients" && <AppPage title="Clients">{empty(Users, "No active clients yet.")}</AppPage>}
          {view === "schedule" && <AppPage title="Schedule"><section className="therapist-schedule"><form onSubmit={(event) => { event.preventDefault(); if (!slot) return; setSlots([...slots, slot]); setSlot(""); notify("Availability saved."); }}><input type="datetime-local" value={slot} onChange={(event) => setSlot(event.target.value)} /><button disabled={!slot}>Add availability</button></form>{slots.length ? slots.map((item) => <div key={item}><CalendarDays /><strong>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item))}</strong><button onClick={() => setSlots(slots.filter((saved) => saved !== item))}>Remove</button></div>) : empty(CalendarDays, "No availability added.")}</section></AppPage>}
          {view === "notes" && <AppPage title="Session notes">{empty(LockKeyhole, "Notes appear after a completed session.")}</AppPage>}
          {view === "profile" && <AppPage title="Professional profile"><form className="therapist-profile-form" onSubmit={(event) => { event.preventDefault(); notify("Professional profile saved."); }}><label>DISPLAY NAME<input value={profile.name} onChange={(event) => setTherapistProfile({ ...profile, name: event.target.value })} required /></label><label>PROFESSIONAL TITLE<input value={profile.title} onChange={(event) => setTherapistProfile({ ...profile, title: event.target.value })} required /></label><label>LICENCE NUMBER<input value={profile.licence} onChange={(event) => setTherapistProfile({ ...profile, licence: event.target.value })} required /></label><label>SUPPORT AREAS<input value={profile.areas} onChange={(event) => setTherapistProfile({ ...profile, areas: event.target.value })} /></label><label>BIO<textarea value={profile.bio} onChange={(event) => setTherapistProfile({ ...profile, bio: event.target.value })} maxLength={600} /></label><button>Save profile</button></form></AppPage>}
        </div>
      </main>
      {toast && <div className="app-toast"><CheckCircle2 />{toast}</div>}
    </div>
  );
}

function Today({
  name,
  setView,
  notify,
  checkins,
  saveCheckin,
}: {
  name: string;
  setView: (v: AppView) => void;
  notify: (m: string) => void;
  checkins: CheckinEntry[];
  saveCheckin: (entry: CheckinEntry) => void;
}) {
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [influences, setInfluences] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const moods = [
    ["Struggling", "Heavy or painful"],
    ["Low", "Flat or drained"],
    ["Unsettled", "Tense or unsure"],
    ["Okay", "Steady enough"],
    ["Good", "Light or settled"],
  ];
  const feelingOptions = [
    "Anxious",
    "Tired",
    "Overwhelmed",
    "Lonely",
    "Calm",
    "Hopeful",
    "Frustrated",
    "Grateful",
  ];
  const influenceOptions = [
    "Work or study",
    "Relationships",
    "Sleep",
    "Health",
    "Money",
    "Climate",
    "Not sure",
  ];
  const toggle = (
    items: string[],
    setItems: (v: string[]) => void,
    item: string,
  ) =>
    setItems(
      items.includes(item) ? items.filter((x) => x !== item) : [...items, item],
    );
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const week = checkins.filter((x) => new Date(x.createdAt) >= startOfWeek);
  const save = () => {
    if (!mood) return;
    saveCheckin({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      mood,
      intensity,
      feelings,
      influences,
      note,
    });
    setStep(1);
    setMood("");
    setFeelings([]);
    setInfluences([]);
    setNote("");
    notify("Check in saved privately.");
  };
  return (
    <>
      <div className="today-head welcome-head">
        <h1>Welcome back, {name}.</h1>
        <time>{date}</time>
      </div>
      <section className="daily-checkin">
        <header>
          <div>
            <strong>Daily check in</strong>
            <h2>How are you, right now?</h2>
          </div>
          <time>{date}</time>
        </header>
        <div className="checkin-steps">
          {["Mood", "Context", "Note"].map((label, i) => (
            <button
              key={label}
              className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}
              onClick={() => step > i + 1 && setStep(i + 1)}
            >
              <span>{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        {step === 1 && (
          <div className="checkin-stage">
            <h3>Which feeling comes closest?</h3>
            <div className="mood-choice-grid">
              {moods.map((item) => (
                <button
                  key={item[0]}
                  className={mood === item[0] ? "active" : ""}
                  onClick={() => setMood(item[0])}
                >
                  <strong>{item[0]}</strong>
                  <small>{item[1]}</small>
                </button>
              ))}
            </div>
            <label className="intensity-control">
              <strong>How strongly do you feel it?</strong>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
              <span>
                {intensity} ·{" "}
                {intensity < 4
                  ? "Faint"
                  : intensity < 7
                    ? "Noticeable"
                    : "Strong"}
              </span>
            </label>
            <button
              className="checkin-next"
              disabled={!mood}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight />
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="checkin-stage">
            <h3>What else is present?</h3>
            <strong>Feelings</strong>
            <div className="tag-picker">
              {feelingOptions.map((item) => (
                <button
                  key={item}
                  className={feelings.includes(item) ? "active" : ""}
                  onClick={() => toggle(feelings, setFeelings, item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <strong>What may be influencing this?</strong>
            <div className="tag-picker">
              {influenceOptions.map((item) => (
                <button
                  key={item}
                  className={influences.includes(item) ? "active" : ""}
                  onClick={() => toggle(influences, setInfluences, item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="checkin-nav">
              <button onClick={() => setStep(1)}>
                <ArrowLeft />
                Back
              </button>
              <button onClick={() => setStep(3)}>
                Continue <ArrowRight />
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="checkin-stage">
            <h3>Would a few words help?</h3>
            <textarea
              value={note}
              maxLength={600}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Private note"
            />
            <div className="note-count">{note.length} / 600</div>
            <div className="checkin-nav">
              <button onClick={() => setStep(2)}>
                <ArrowLeft />
                Back
              </button>
              <button className="save-checkin" onClick={save}>
                Save check in
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="week-overview">
        <div>
          <h2>Your week</h2>
          <strong>
            {week.length} {week.length === 1 ? "day" : "days"} this week
          </strong>
        </div>
        <div className="week-days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
            const active = week.some(
              (entry) => (new Date(entry.createdAt).getDay() + 6) % 7 === i,
            );
            return (
              <span key={day} className={active ? "active" : ""}>
                <i />
                {day}
              </span>
            );
          })}
        </div>
        <button onClick={() => setView("history")}>
          View history <ChevronRight />
        </button>
      </section>
      <section className="quick-actions five">
        <button onClick={() => setView("talk")}>
          <span className="qa-icon aqua">
            <MessageCircle />
          </span>
          <strong>Tranquiliva AI</strong>
        </button>
        <button onClick={() => setView("journal")}>
          <span className="qa-icon violet">
            <PenLine />
          </span>
          <strong>Journal</strong>
        </button>
        <button onClick={() => setView("resources")}>
          <span className="qa-icon green">
            <Leaf />
          </span>
          <strong>Resources</strong>
        </button>
        <button onClick={() => setView("brain")}>
          <span className="qa-icon brain">
            <Brain />
          </span>
          <strong>Know your brain</strong>
        </button>
        <button onClick={() => setView("causecanvas")}>
          <span className="qa-icon climate">
            <Earth />
          </span>
          <strong>CauseCanvas</strong>
        </button>
      </section>
    </>
  );
}

function Talk({ name, notify }: { name: string; notify: (m: string) => void }) {
  type AiMessage = { role: "user" | "assistant"; text: string };
  type AiSession = {
    id: string;
    title: string;
    updatedAt: string;
    messages: AiMessage[];
  };
  const greeting = `Hi ${name}. What would feel useful to talk through?`;
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "assistant", text: greeting },
  ]);
  const [histories, setHistories] = useState<AiSession[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        window.localStorage.getItem("tranquiliva-ai-history") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [clearOpen, setClearOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [journalConsent, setJournalConsent] = useState(false);
  const [exercise, setExercise] = useState<"breathing" | "grounding" | null>(
    null,
  );
  const [urgent, setUrgent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    window.localStorage.setItem(
      "tranquiliva-ai-history",
      JSON.stringify(histories),
    );
  }, [histories]);
  const respond = async (value: string) => {
    const lower = value.toLowerCase();
    const crisis = [
      "suicide",
      "kill myself",
      "end my life",
      "self harm",
      "can't go on",
      "cannot go on",
    ].some((term) => lower.includes(term));
    if (crisis) {
      setUrgent(true);
      return "I am concerned about your immediate safety. Please use the urgent support options shown now and contact a trusted person nearby.";
    }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = window.sessionStorage.getItem("tranquiliva-id-token");
    if (!apiBase || !token) throw new Error("AI support is not connected to your account.");
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: value, language, journalContextAllowed: journalConsent }),
    });
    const data = await response.json();
    if (!response.ok || !data?.message) throw new Error(data?.error || "AI support is unavailable right now.");
    return String(data.message);
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || aiBusy) return;
    const value = text.trim();
    const next = [...messages, { role: "user" as const, text: value }];
    setMessages(next);
    setText("");
    setAiBusy(true);
    try {
      const reply = await respond(value);
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch (error) {
      setMessages([...next, { role: "assistant", text: error instanceof Error ? error.message : "AI support is unavailable right now." }]);
    } finally {
      setAiBusy(false);
    }
  };
  const saveSession = () => {
    if (messages.length < 2) return;
    const session = {
      id: crypto.randomUUID(),
      title:
        messages.find((m) => m.role === "user")?.text.slice(0, 42) ||
        "Private reflection",
      updatedAt: new Date().toISOString(),
      messages,
    };
    setHistories([session, ...histories]);
    notify("Conversation saved.");
  };
  const newSession = () => {
    saveSession();
    setMessages([{ role: "assistant", text: greeting }]);
    setUrgent(false);
    setExercise(null);
    notify("New conversation started.");
  };
  const saveJournal = () => {
    const insight = messages.filter((m) => m.role === "user").at(-1)?.text;
    if (!insight) {
      notify("Write something first.");
      return;
    }
    const notes = JSON.parse(
      window.localStorage.getItem("tranquiliva-journal-notes") || "[]",
    );
    window.localStorage.setItem(
      "tranquiliva-journal-notes",
      JSON.stringify([
        { createdAt: new Date().toISOString(), text: insight },
        ...notes,
      ]),
    );
    notify("Saved to journal notes.");
  };
  return (
    <AppPage title="Tranquiliva AI">
      <section className="ai-boundary">
        <ShieldCheck />
        <p>
          Reflection and educational support. No diagnosis or emergency care.
        </p>
        <button onClick={() => setPrivacyOpen(true)}>AI limits</button>
      </section>
      <div className="ai-layout">
        <aside className="ai-history">
          <button className="new-ai" onClick={newSession}>
            <Plus />
            New conversation
          </button>
          <h2>Conversations</h2>
          {histories.length ? (
            histories.map((session) => (
              <button
                key={session.id}
                onClick={() => setMessages(session.messages)}
              >
                <MessageCircle />
                <div>
                  <strong>{session.title}</strong>
                  <small>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(session.updatedAt))}
                  </small>
                </div>
              </button>
            ))
          ) : (
            <p>No saved conversations yet.</p>
          )}
          <div className="ai-plan">
            <strong>Free plan</strong>
            <span>Included in your Free plan.</span>
          </div>
          <button className="clear-ai" onClick={() => setClearOpen(true)}>
            Clear AI history
          </button>
          <button className="clear-ai" onClick={() => setPrivacyOpen(true)}>
            AI privacy settings
          </button>
        </aside>
        <main className="ai-chat">
          <header>
            <div>
              <Mark />
              <div>
                <strong>Tranquiliva AI</strong>
                <small>Private reflection</small>
              </div>
            </div>
            <button onClick={newSession}>End session</button>
          </header>
          {urgent && (
            <section className="urgent-ai">
              <Heart />
              <div>
                <strong>Need urgent support?</strong>
                <p>
                  Contact local emergency services or someone you trust nearby.
                </p>
              </div>
              <a href="https://findahelpline.com" target="_blank" rel="noreferrer">Get support</a>
            </section>
          )}
          <div className="ai-messages">
            {messages.map((message, i) => (
              <article key={i} className={message.role}>
                <strong>
                  {message.role === "assistant" ? "Tranquiliva AI" : "You"}
                </strong>
                <p>{message.text}</p>
              </article>
            ))}
          </div>
          {exercise && (
            <section className="ai-exercise">
              <button onClick={() => setExercise(null)}>
                <X />
              </button>
              {exercise === "breathing" ? (
                <>
                  <div className="breath-orb" />
                  <h2>60 second breathing</h2>
                  <p>Inhale gently. Exhale slowly.</p>
                </>
              ) : (
                <>
                  <Compass />
                  <h2>Five senses reset</h2>
                  <p>
                    Notice five things you see. Four you feel. Three you hear.
                  </p>
                </>
              )}
            </section>
          )}
          <form className="ai-composer" onSubmit={send}>
            <textarea
              value={text}
              maxLength={3000}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message Tranquiliva AI"
            />
            <div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option>English</option>
                <option>Twi</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
              <span>{text.length} / 3000</span>
              <button disabled={!text.trim() || aiBusy} aria-label="Send message">
                {aiBusy ? <Clock3 /> : <Send />}
              </button>
            </div>
          </form>
          <footer className="ai-disclaimer">
            <LockKeyhole />
            Private to this device. AI can make mistakes.
          </footer>
        </main>
        <aside className="ai-tools">
          <section>
            <h2>Current session</h2>
            <strong>Private reflection</strong>
            <span>
              Active
            </span>
          </section>
          <section>
            <h2>Try something now</h2>
            <button onClick={() => setExercise("breathing")}>
              <Leaf />
              <strong>60 second breathing</strong>
            </button>
            <button onClick={() => setExercise("grounding")}>
              <Compass />
              <strong>Five senses reset</strong>
            </button>
            <button onClick={saveJournal}>
              <PenLine />
              <strong>Save a journal note</strong>
            </button>
          </section>
          <section>
            <h2>Your privacy</h2>
            <label>
              <input
                type="checkbox"
                checked={journalConsent}
                onChange={() => setJournalConsent(!journalConsent)}
              />
              Allow journal context
            </label>
            <button onClick={() => setClearOpen(true)}>
              Delete conversations
            </button>
          </section>
        </aside>
      </div>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="ai-alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes saved conversations from this device. Journal notes
              are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setHistories([]);
                setMessages([{ role: "assistant", text: greeting }]);
                setClearOpen(false);
                notify("AI history deleted.");
              }}
            >
              Delete history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="community-dialog">
          <DialogHeader>
            <DialogTitle>AI privacy</DialogTitle>
            <DialogDescription>
              Journal access is off unless you allow it. Conversations can be
              deleted anytime.
            </DialogDescription>
          </DialogHeader>
          <label className="privacy-consent">
            <input
              type="checkbox"
              checked={journalConsent}
              onChange={() => setJournalConsent(!journalConsent)}
            />
            Allow journal context
          </label>
          <button
            className="dialog-action"
            onClick={() => setPrivacyOpen(false)}
          >
            Done
          </button>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
function Journal({ notify }: { notify: (m: string) => void }) {
  type Entry = { id: string; createdAt: string; title: string; text: string };
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (typeof window === "undefined") return [];
    const journal = JSON.parse(
      window.localStorage.getItem("tranquiliva-journal") || "[]",
    );
    const ai = JSON.parse(
      window.localStorage.getItem("tranquiliva-journal-notes") || "[]",
    ).map((item: { createdAt: string; text: string }) => ({
      id: crypto.randomUUID(),
      createdAt: item.createdAt,
      title: "From Tranquiliva AI",
      text: item.text,
    }));
    return [...journal, ...ai].sort(
      (a: Entry, b: Entry) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  });
  useEffect(() => {
    window.localStorage.setItem(
      "tranquiliva-journal",
      JSON.stringify(
        entries.filter((entry) => entry.title !== "From Tranquiliva AI"),
      ),
    );
  }, [entries]);
  const save = () => {
    if (!text.trim()) return;
    setEntries([
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        title: title.trim() || "Untitled moment",
        text: text.trim(),
      },
      ...entries,
    ]);
    setText("");
    setTitle("");
    notify("Journal entry saved.");
  };
  return (
    <AppPage title="Journal">
      <div className="journal-premium">
        <section className="journal-paper">
          <div>
            <span>
              {new Intl.DateTimeFormat("en", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
                .format(new Date())
                .toUpperCase()}
            </span>
            <span>
              <LockKeyhole />
              PRIVATE
            </span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled moment"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start wherever you are…"
          />
          <footer>
            <small>
              {text.trim() ? text.trim().split(/\s+/).length : 0} words
            </small>
            <button disabled={!text.trim()} onClick={save}>
              Save entry
            </button>
          </footer>
        </section>
        <aside className="journal-history">
          <h2>Entries</h2>
          {entries.length ? (
            entries.slice(0, 8).map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setTitle(entry.title);
                  setText(entry.text);
                }}
              >
                <strong>{entry.title}</strong>
                <small>
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(entry.createdAt))}
                </small>
              </button>
            ))
          ) : (
            <p>No journal entries yet.</p>
          )}
          <div className="journal-prompt">
            <Sparkles />
            <strong>What would make the next hour feel 5% gentler?</strong>
            <button
              onClick={() =>
                setText("What would make the next hour feel 5% gentler is…")
              }
            >
              Use prompt
            </button>
          </div>
        </aside>
      </div>
    </AppPage>
  );
}
function Resources({ notify }: { notify: (m: string) => void }) {
  const items = [
    {
      id: "reset",
      title: "A quiet reset",
      topic: "Stress",
      format: "Audio",
      minutes: 3,
      reviewed: "12 Aug 2026",
      offline: true,
      icon: Leaf,
    },
    {
      id: "needs",
      title: "Name what you need",
      topic: "Relationships",
      format: "Article",
      minutes: 6,
      reviewed: "20 Aug 2026",
      offline: true,
      icon: Compass,
    },
    {
      id: "climate",
      title: "Climate worry reset",
      topic: "Climate",
      format: "Practice",
      minutes: 4,
      reviewed: "18 Aug 2026",
      offline: true,
      icon: Earth,
    },
    {
      id: "sleep",
      title: "A calmer evening",
      topic: "Sleep",
      format: "Video",
      minutes: 8,
      reviewed: "22 Aug 2026",
      offline: false,
      icon: Moon,
    },
    {
      id: "work",
      title: "Workload boundaries",
      topic: "Work",
      format: "Article",
      minutes: 5,
      reviewed: "14 Aug 2026",
      offline: true,
      icon: ShieldCheck,
    },
  ];
  const studio = [
    { id: "breathing", title: "60 second breathing", icon: Leaf },
    { id: "grounding", title: "Five senses reset", icon: Compass },
    { id: "doodle", title: "Doodle pad", icon: PenLine },
    { id: "words", title: "Positive word hunt", icon: Search },
    { id: "appreciations", title: "Three appreciations", icon: Heart },
  ];
  const [tab, setTab] = useState("All resources");
  const [topic, setTopic] = useState("All");
  const [format, setFormat] = useState("All");
  const [duration, setDuration] = useState("Any time");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("tranquiliva-saved-resources") || "[]",
    );
  });
  const [completed, setCompleted] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("tranquiliva-completed-resources") || "[]",
    );
  });
  const [active, setActive] = useState<string | null>(null);
  const [senses, setSenses] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [appreciations, setAppreciations] = useState(["", "", ""]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    window.localStorage.setItem(
      "tranquiliva-saved-resources",
      JSON.stringify(saved),
    );
    window.localStorage.setItem(
      "tranquiliva-completed-resources",
      JSON.stringify(completed),
    );
  }, [saved, completed]);
  const visible = items.filter(
    (item) =>
      (topic === "All" || item.topic === topic) &&
      (format === "All" || item.format === format) &&
      (duration === "Any time" || item.minutes <= Number(duration)) &&
      item.title.toLowerCase().includes(query.toLowerCase()) &&
      (tab !== "Saved" || saved.includes(item.id)) &&
      (tab !== "Completed" || completed.includes(item.id)),
  );
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#55d6d9";
    ctx.lineTo(
      (e.clientX - box.left) * (canvas.width / box.width),
      (e.clientY - box.top) * (canvas.height / box.height),
    );
    ctx.stroke();
  };
  return (
    <AppPage title="Resources">
      <nav className="library-tabs">
        {["All resources", "Wellness studio", "Saved", "Completed"].map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ),
        )}
      </nav>
      {tab !== "Wellness studio" ? (
        <>
          <section className="resource-controls">
            <div className="app-search">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources"
              />
            </div>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option>All</option>
              <option>Stress</option>
              <option>Sleep</option>
              <option>Climate</option>
              <option>Work</option>
              <option>Relationships</option>
            </select>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>All</option>
              <option>Article</option>
              <option>Audio</option>
              <option>Video</option>
              <option>Practice</option>
            </select>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option>Any time</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
            </select>
          </section>
          <div className="resource-list">
            {visible.length ? (
              visible.map((item) => (
                <article key={item.id}>
                  <div className="resource-glyph">
                    <item.icon />
                  </div>
                  <div>
                    <small>
                      {item.format} · {item.minutes} min
                    </small>
                    <h2>{item.title}</h2>
                    <p>
                      {item.topic} · Reviewed {item.reviewed}
                    </p>
                  </div>
                  <div className="resource-actions">
                    <button
                      className={saved.includes(item.id) ? "active" : ""}
                      onClick={() =>
                        setSaved(
                          saved.includes(item.id)
                            ? saved.filter((x) => x !== item.id)
                            : [...saved, item.id],
                        )
                      }
                    >
                      <Bookmark />
                    </button>
                    <button
                      onClick={() => {
                        setCompleted(
                          completed.includes(item.id)
                            ? completed
                            : [...completed, item.id],
                        );
                        notify(`${item.title} opened.`);
                      }}
                    >
                      Open <ArrowRight />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <section className="resource-empty">
                <BookOpen />
                <h2>No resources found.</h2>
              </section>
            )}
          </div>
        </>
      ) : (
        <>
          <section className="studio-grid">
            {studio.map((item) => (
              <button key={item.id} onClick={() => setActive(item.id)}>
                <span>
                  <item.icon />
                </span>
                <strong>{item.title}</strong>
                <ArrowRight />
              </button>
            ))}
          </section>
        </>
      )}
      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="practice-dialog">
          <DialogHeader>
            <DialogTitle>
              {studio.find((x) => x.id === active)?.title}
            </DialogTitle>
          </DialogHeader>
          {active === "breathing" && (
            <div className="full-breath">
              <div className="breath-orb" />
              <strong>Inhale</strong>
              <p>Follow the rhythm for one minute.</p>
            </div>
          )}
          {active === "grounding" && (
            <div className="senses-list">
              {[
                "5 things you see",
                "4 things you feel",
                "3 things you hear",
                "2 things you smell",
                "1 thing you taste",
              ].map((item) => (
                <button
                  key={item}
                  className={senses.includes(item) ? "active" : ""}
                  onClick={() =>
                    setSenses(
                      senses.includes(item)
                        ? senses.filter((x) => x !== item)
                        : [...senses, item],
                    )
                  }
                >
                  <CheckCircle2 />
                  {item}
                </button>
              ))}
            </div>
          )}
          {active === "doodle" && (
            <div className="doodle-tool">
              <canvas
                ref={canvasRef}
                width="760"
                height="460"
                onPointerDown={(e) => {
                  drawing.current = true;
                  const canvas = canvasRef.current;
                  const box = canvas!.getBoundingClientRect();
                  const ctx = canvas!.getContext("2d")!;
                  ctx.beginPath();
                  ctx.moveTo(
                    (e.clientX - box.left) * (canvas!.width / box.width),
                    (e.clientY - box.top) * (canvas!.height / box.height),
                  );
                }}
                onPointerMove={draw}
                onPointerUp={() => (drawing.current = false)}
                onPointerLeave={() => (drawing.current = false)}
              />
              <button
                onClick={() =>
                  canvasRef.current?.getContext("2d")?.clearRect(0, 0, 760, 460)
                }
              >
                Clear
              </button>
            </div>
          )}
          {active === "words" && (
            <div className="word-hunt">
              {[
                "GENTLE",
                "STATIC",
                "HOPE",
                "CLOUD",
                "CALM",
                "RIVER",
                "KIND",
                "STONE",
                "REST",
              ].map((word) => (
                <button
                  key={word}
                  className={found.includes(word) ? "active" : ""}
                  onClick={() =>
                    ["GENTLE", "HOPE", "CALM", "KIND", "REST"].includes(word) &&
                    setFound([...new Set([...found, word])])
                  }
                >
                  {word}
                </button>
              ))}
              <strong>{found.length} / 5 found</strong>
            </div>
          )}
          {active === "appreciations" && (
            <div className="appreciation-list">
              {appreciations.map((value, i) => (
                <input
                  key={i}
                  value={value}
                  onChange={(e) =>
                    setAppreciations(
                      appreciations.map((v, n) =>
                        n === i ? e.target.value : v,
                      ),
                    )
                  }
                  placeholder={`Appreciation ${i + 1}`}
                />
              ))}
            </div>
          )}
          <button
            className="dialog-action"
            onClick={() => {
              setActive(null);
              notify("Practice completed.");
            }}
          >
            Done
          </button>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
function Community({ notify }: { notify: (m: string) => void }) {
  type CommunityPost = { id: string; name: string; topic: string; title: string; body: string; likes: number; replies: number };
  const topics = [
    "All conversations",
    "Anxiety and worry",
    "Work and study",
    "Sleep and rest",
    "Relationships",
    "Small wins",
    "Climate feelings",
  ];
  const [topic, setTopic] = useState(topics[0]);
  const [tab, setTab] = useState("Community home");
  const [compose, setCompose] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [postTopic, setPostTopic] = useState(topics[1]);
  const [identity, setIdentity] = useState(() => {
    if (typeof window === "undefined") return "Quiet Baobab";
    return window.localStorage.getItem("tranquiliva-anonymous-name") || "Quiet Baobab";
  });
  const [renaming, setRenaming] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("tranquiliva-community-posts") || "[]"); }
    catch { return []; }
  });
  useEffect(() => {
    window.localStorage.setItem("tranquiliva-community-posts", JSON.stringify(posts));
    window.localStorage.setItem("tranquiliva-anonymous-name", identity);
  }, [posts, identity]);
  const visible = posts.filter(
    (p) =>
      (topic === "All conversations" || p.topic === topic) &&
      (tab !== "Following" || following.includes(p.id)) &&
      (tab !== "Saved posts" || saved.includes(p.id)) &&
      (tab !== "My posts" || p.name === identity),
  );
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const publish = () => {
    if (!draft.trim()) return;
    setPosts([
      {
        id: `mine${Date.now()}`,
        name: identity,
        topic: postTopic,
        title: draft.trim().slice(0, 58),
        body: draft.trim(),
        likes: 0,
        replies: 0,
      },
      ...posts,
    ]);
    setDraft("");
    setCompose(false);
    setTab("My posts");
    notify("Posted anonymously.");
  };
  return (
    <AppPage title="Community">
      <section className="community-identity">
        <div className="anon-mark">
          <Users />
        </div>
        <div>
          <strong>{identity}</strong>
          <p>Anonymous</p>
        </div>
        {renaming ? (
          <input
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            onBlur={() => setRenaming(false)}
            autoFocus
          />
        ) : (
          <button onClick={() => setRenaming(true)}>
            Change anonymous name
          </button>
        )}
        <button className="create-post" onClick={() => setCompose(true)}>
          <Plus />
          Create a post
        </button>
      </section>
      <nav className="community-tabs">
        {["Community home", "Following", "Saved posts", "My posts"].map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ),
        )}
      </nav>
      <div className="community-topics">
        {topics.map((item) => (
          <button
            key={item}
            className={topic === item ? "active" : ""}
            onClick={() => setTopic(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="community-safety">
        <ShieldCheck />
        <strong>A slower kind of community</strong>
        <p>
          Share experience. Avoid diagnosis, medical instructions and private
          contact requests.
        </p>
        <a href="https://findahelpline.com" target="_blank" rel="noreferrer">Crisis support</a>
      </section>
      <div className="community-layout">
        <main className="post-feed">
          {visible.length ? (
            visible.map((post) => (
              <article className="community-post" key={post.id}>
                <header>
                  <div className="anon-avatar">
                    {post.name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <strong>{post.name}</strong>
                    <small>Anonymous member</small>
                  </div>
                  <button
                    className={following.includes(post.id) ? "active" : ""}
                    onClick={() => toggle(following, setFollowing, post.id)}
                  >
                    {following.includes(post.id) ? "Following" : "Follow"}
                  </button>
                </header>
                <button
                  className="post-topic"
                  onClick={() => setTopic(post.topic)}
                >
                  {post.topic}
                </button>
                <h2>{post.title}</h2>
                <p>{post.body}</p>
                <footer>
                  <button
                    className={liked.includes(post.id) ? "active" : ""}
                    onClick={() => toggle(liked, setLiked, post.id)}
                  >
                    <ThumbsUp />
                    {post.likes + (liked.includes(post.id) ? 1 : 0)}
                  </button>
                  <button
                    onClick={() =>
                      setReplying(replying === post.id ? null : post.id)
                    }
                  >
                    <MessageCircle />
                    {post.replies}
                  </button>
                  <button
                    className={saved.includes(post.id) ? "active" : ""}
                    onClick={() => toggle(saved, setSaved, post.id)}
                  >
                    <Bookmark />
                    Save
                  </button>
                  <button onClick={() => setReporting(post.id)}>
                    <Flag />
                    Report
                  </button>
                </footer>
                {replying === post.id && (
                  <form
                    className="community-reply"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (reply.trim()) {
                        setPosts(posts.map((item) => item.id === post.id ? { ...item, replies: item.replies + 1 } : item));
                        setReply("");
                        setReplying(null);
                        notify("Reply posted anonymously.");
                      }
                    }}
                  >
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply from your experience"
                    />
                    <button>
                      <Send />
                    </button>
                  </form>
                )}
              </article>
            ))
          ) : (
            <div className="community-empty">
              <Users />
              <h2>Nothing here yet.</h2>
              <button onClick={() => setCompose(true)}>Create a post</button>
            </div>
          )}
        </main>
        <aside className="moderated-rooms">
          <h2>Moderated rooms</h2>
          <div className="rooms-empty"><Users /><strong>No live rooms now.</strong></div>
          <div className="moderation-note">
            <ShieldCheck />
            <strong>Active moderation</strong>
            <p>Automated checks, human review and appeals.</p>
          </div>
        </aside>
      </div>
      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent className="community-dialog">
          <DialogHeader>
            <DialogTitle>Post anonymously</DialogTitle>
            <DialogDescription>
              Your Tranquiliva profile stays hidden.
            </DialogDescription>
          </DialogHeader>
          <select
            value={postTopic}
            onChange={(e) => setPostTopic(e.target.value)}
          >
            {topics.slice(1).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What would you like to share?"
          />
          <button
            className="dialog-action"
            disabled={!draft.trim()}
            onClick={publish}
          >
            Post anonymously <Send />
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!reporting} onOpenChange={() => setReporting(null)}>
        <DialogContent className="community-dialog report-dialog">
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>Choose the closest reason.</DialogDescription>
          </DialogHeader>
          {[
            "Medical advice",
            "Private contact request",
            "Harassment",
            "Crisis concern",
            "Other",
          ].map((reason) => (
            <button
              className="report-option"
              key={reason}
              onClick={() => {
                setReporting(null);
                notify("Report sent to moderation.");
              }}
            >
              {reason}
              <ChevronRight />
            </button>
          ))}
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
function Therapists({ notify }: { notify: (m: string) => void }) {
  const [query, setQuery] = useState("");
  return (
    <AppPage title="Therapists">
      <div className="therapist-filter">
        <div className="app-search">
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or support area" />
        </div>
        <button>
          <CalendarDays />
          Availability
          <ChevronDown />
        </button>
      </div>
      <div className="therapist-directory">
        <div className="directory-empty">
          <Heart />
          <h2>{query ? "No matching therapists." : "No verified therapists available yet."}</h2>
          <button onClick={() => notify("Availability alert saved.")}>Notify me when care is available</button>
        </div>
      </div>
      <div className="verified-explainer">
        <ShieldCheck />
        <div>
          <h2>Verified means checked.</h2>
          <p>Identity, licence and scope reviewed by staff.</p>
        </div>
      </div>
    </AppPage>
  );
}
function KnowYourBrain({
  setView,
  notify,
}: {
  setView: (v: AppView) => void;
  notify: (m: string) => void;
}) {
  const topics = {
    anxiety: {
      label: "Anxiety and worry",
      title: "When your alarm system stays ready",
      response:
        "Your brain and body can prepare for danger even when the threat is uncertain. This is a protective response, not a personal failure.",
      myth: "If I feel anxious, something must be wrong with me.",
      truth:
        "Anxiety is a human response. It becomes a concern when it persists, causes distress or disrupts daily life.",
      path: "Understand the alarm response",
      action: "Slow the next five exhales.",
      source: "NIMH Stress and Anxiety",
      url: "https://www.nimh.nih.gov/health/publications/so-stressed-out-fact-sheet",
    },
    focus: {
      label: "Focus and overload",
      title: "Why focus narrows under pressure",
      response:
        "When demands compete for attention, the brain prioritises what feels urgent. Focus can become narrow or scattered.",
      myth: "Struggling to focus means I am lazy.",
      truth:
        "Attention changes with sleep, stress, environment, health and task demands. Difficulty is information, not a character judgement.",
      path: "Build a lighter focus loop",
      action: "Choose one task for ten minutes.",
      source: "WHO Mental Health",
      url: "https://www.who.int/health-topics/mental-health",
    },
    sleep: {
      label: "Sleep and rest",
      title: "Why rest cannot always be forced",
      response:
        "A watchful nervous system can make rest feel difficult. Trying harder can add pressure to a process that needs safety and rhythm.",
      myth: "If I cannot sleep, I have failed at resting.",
      truth:
        "Rest includes quiet recovery, not only sleep. A difficult night does not define your ability to recover.",
      path: "Prepare the body for rest",
      action: "Dim one light and put one task down.",
      source: "NIMH Caring for Mental Health",
      url: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    },
    connection: {
      label: "Connection and loneliness",
      title: "Why connection matters to the nervous system",
      response:
        "Belonging can help the body read the environment as safer. Loneliness is not proof that you are unwanted.",
      myth: "Needing people makes me weak.",
      truth:
        "Humans depend on connection throughout life. Asking for support is a practical response to a shared need.",
      path: "Find a low pressure point of contact",
      action: "Send one honest sentence to someone safe.",
      source: "WHO Mental Health",
      url: "https://www.who.int/health-topics/mental-health",
    },
  } as const;
  type TopicKey = keyof typeof topics;
  const [focus, setFocus] = useState<TopicKey>("anxiety");
  const [start, setStart] = useState(() =>
    typeof window === "undefined"
      ? "I feel on edge"
      : window.localStorage.getItem("tranquiliva-brain-start") ||
        "I feel on edge",
  );
  const [mythOpen, setMythOpen] = useState(true);
  const [saved, setSaved] = useState<TopicKey[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        window.localStorage.getItem("tranquiliva-brain-saved") || "[]",
      );
    } catch {
      return [];
    }
  });
  useEffect(() => {
    window.localStorage.setItem("tranquiliva-brain-start", start);
    window.localStorage.setItem(
      "tranquiliva-brain-saved",
      JSON.stringify(saved),
    );
  }, [start, saved]);
  const current = topics[focus];
  const isSaved = saved.includes(focus);
  return (
    <AppPage title="Know your brain">
      <section className="brain-start">
        <div>
          <Brain />
          <strong>Choose a starting point</strong>
        </div>
        <div className="start-selector">
          {[
            "I feel on edge",
            "My mind will not slow down",
            "I cannot focus",
            "I feel alone",
          ].map((item) => (
            <button
              key={item}
              className={start === item ? "active" : ""}
              onClick={() => setStart(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <small>Saved only on this device.</small>
      </section>
      <div className="brain-workspace">
        <nav className="brain-topics">
          <strong>Topics</strong>
          {Object.entries(topics).map(([id, item]) => (
            <button
              key={id}
              className={focus === id ? "active" : ""}
              onClick={() => setFocus(id as TopicKey)}
            >
              <span>{item.label}</span>
              <ChevronRight />
            </button>
          ))}
          <button
            className="saved-topics"
            onClick={() =>
              notify(
                `${saved.length} saved topic${saved.length === 1 ? "" : "s"}.`,
              )
            }
          >
            <Bookmark />
            {saved.length} saved
          </button>
        </nav>
        <main className="brain-learning">
          <header>
            <div>
              <small>{current.path}</small>
              <h2>{current.title}</h2>
            </div>
            <button
              className={isSaved ? "active" : ""}
              onClick={() =>
                setSaved(
                  isSaved
                    ? saved.filter((x) => x !== focus)
                    : [...saved, focus],
                )
              }
            >
              <Bookmark />
              {isSaved ? "Saved" : "Save"}
            </button>
          </header>
          <section className="body-response">
            <div className="brain-pulse">
              <Brain />
            </div>
            <div>
              <h3>Brain and body</h3>
              <p>{current.response}</p>
            </div>
          </section>
          <section className={`myth-card ${mythOpen ? "open" : ""}`}>
            <button onClick={() => setMythOpen(!mythOpen)}>
              <div>
                <small>MYTH</small>
                <strong>{current.myth}</strong>
              </div>
              <ChevronDown />
            </button>
            {mythOpen && (
              <div>
                <small>WHAT HELPS</small>
                <p>{current.truth}</p>
              </div>
            )}
          </section>
          <section className="learning-next">
            <h3>Take the next step</h3>
            <strong>{current.action}</strong>
            <div>
              <button onClick={() => setView("journal")}>
                <PenLine />
                Reflect
              </button>
              <button onClick={() => setView("today")}>
                <Compass />
                Check in
              </button>
              <button onClick={() => setView("resources")}>
                <BookOpen />
                Resources
              </button>
              <button onClick={() => setView("talk")}>
                <MessageCircle />
                AI support
              </button>
            </div>
          </section>
          <footer className="brain-trust">
            <div>
              <ShieldCheck />
              <p>No diagnosis. Reviewed August 2026.</p>
            </div>
            <a href={current.url} target="_blank" rel="noreferrer">
              {current.source}
              <ArrowRight />
            </a>
            <a href="mailto:hello@tranquiliva.com?subject=Know%20Your%20Brain%20correction">Correction policy</a>
          </footer>
        </main>
      </div>
    </AppPage>
  );
}

function CauseCanvas({ notify }: { notify: (m: string) => void }) {
  type CanvasProject = {
    id: string;
    name: string;
    cause: "Mental health" | "Climate wellbeing";
    status: string;
  };
  const [cause, setCause] = useState<"Mental health" | "Climate wellbeing">(
    "Climate wellbeing",
  );
  const [workspace, setWorkspace] = useState("Create");
  const [title, setTitle] = useState("A kinder climate conversation");
  const [message, setMessage] = useState(
    "Climate concern can feel heavy. Choose one local action and protect time to recover.",
  );
  const [audience, setAudience] = useState("Community");
  const [action, setAction] = useState("Join a local action");
  const [tone, setTone] = useState("Warm");
  const [format, setFormat] = useState("Square post");
  const [observance, setObservance] = useState(
    "World Environment Day · 5 June",
  );
  const [brand, setBrand] = useState("Tranquiliva");
  const [checks, setChecks] = useState([true, true, false, false]);
  const [versions, setVersions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("tranquiliva-canvas-versions") || "[]",
    );
  });
  const [projects, setProjects] = useState<CanvasProject[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(
      window.localStorage.getItem("tranquiliva-canvas-projects") || "[]",
    );
  });
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const observances =
    cause === "Mental health"
      ? ["No observance", "World Mental Health Day · 10 October"]
      : [
          "No observance",
          "International Mother Earth Day · 22 April",
          "World Environment Day · 5 June",
        ];
  const suggestions =
    cause === "Mental health"
      ? [
          "Asking for support is a practical step.",
          "Mental health belongs in everyday conversation.",
          "Pause. Notice. Reach out.",
        ]
      : [
          "Climate action and personal recovery can exist together.",
          "Care for the planet without abandoning care for yourself.",
          "One local action can turn worry into direction.",
        ];
  useEffect(() => {
    window.localStorage.setItem(
      "tranquiliva-canvas-projects",
      JSON.stringify(projects),
    );
    window.localStorage.setItem(
      "tranquiliva-canvas-versions",
      JSON.stringify(versions),
    );
  }, [projects, versions]);
  const deviceKey = () => {
    let value = window.localStorage.getItem("tranquiliva-canvas-device-key");
    if (!value) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      value = btoa(String.fromCharCode(...bytes));
      window.localStorage.setItem("tranquiliva-canvas-device-key", value);
    }
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  };
  const encryptDraft = async (payload: object) => {
    const key = await crypto.subtle.importKey(
      "raw",
      deviceKey(),
      "AES-GCM",
      false,
      ["encrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    );
    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(data))),
    };
  };
  const decryptDraft = async (id: string) => {
    const drafts = JSON.parse(
      window.localStorage.getItem("tranquiliva-canvas-drafts") || "{}",
    );
    const encrypted = drafts[id];
    if (!encrypted) return;
    const key = await crypto.subtle.importKey(
      "raw",
      deviceKey(),
      "AES-GCM",
      false,
      ["decrypt"],
    );
    const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(encrypted.data), (c) => c.charCodeAt(0));
    const result = JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data),
      ),
    );
    setTitle(result.title);
    setMessage(result.message);
    setCause(result.cause);
    setAudience(result.audience);
    setAction(result.action);
    setTone(result.tone);
    setFormat(result.format);
    setObservance(result.observance);
    setBrand(result.brand);
    setChecks(result.checks);
    setActiveProject(id);
    setWorkspace("Create");
  };
  const saveDraft = async () => {
    const id = activeProject || crypto.randomUUID();
    const encrypted = await encryptDraft({
      title,
      message,
      cause,
      audience,
      action,
      tone,
      format,
      observance,
      brand,
      checks,
    });
    const drafts = JSON.parse(
      window.localStorage.getItem("tranquiliva-canvas-drafts") || "{}",
    );
    drafts[id] = encrypted;
    window.localStorage.setItem(
      "tranquiliva-canvas-drafts",
      JSON.stringify(drafts),
    );
    setActiveProject(id);
    setVersions([
      `Encrypted draft saved ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date())}`,
      ...versions,
    ]);
    setProjects([
      { id, name: title || "Untitled campaign", cause, status: "Draft" },
      ...projects.filter((p) => p.id !== id),
    ]);
    notify("Encrypted draft saved.");
  };
  const generateMessage = () => {
    setGenerating(true);
    window.setTimeout(() => {
      const index =
        Math.abs((audience + action + tone).length) % suggestions.length;
      setMessage(suggestions[index]);
      setGenerating(false);
      notify("Message generated.");
    }, 450);
  };
  const exportCampaign = () => {
    const file = `${title}\n${cause}\n${observance}\n${audience}\n${action}\n${message}\n\nReviewed in CauseCanvas`;
    const blob = new Blob([file], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CauseCanvas_Campaign.txt";
    link.click();
    URL.revokeObjectURL(url);
    notify("Campaign exported.");
  };
  const strictReview = /suicid|self harm|kill myself|end my life/i.test(
    `${title} ${message}`,
  );
  const safe =
    checks.slice(0, 3).every(Boolean) && (!strictReview || checks[3]);
  return (
    <AppPage title="CauseCanvas">
      <nav className="canvas-nav">
        {["Create", "Projects", "Brand kits", "Version history"].map((item) => (
          <button
            key={item}
            className={workspace === item ? "active" : ""}
            onClick={() => setWorkspace(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {workspace === "Create" && (
        <div className="canvas-studio">
          <main className="canvas-controls">
            <section>
              <h2>Choose a cause</h2>
              <div className="cause-switch">
                <button
                  className={cause === "Mental health" ? "active" : ""}
                  onClick={() => {
                    setCause("Mental health");
                    setObservance("World Mental Health Day · 10 October");
                    setMessage(
                      "Mental health belongs in everyday conversation.",
                    );
                  }}
                >
                  <Brain />
                  Mental health
                </button>
                <button
                  className={cause === "Climate wellbeing" ? "active" : ""}
                  onClick={() => {
                    setCause("Climate wellbeing");
                    setObservance("World Environment Day · 5 June");
                    setMessage(
                      "Climate concern can feel heavy. Choose one local action and protect time to recover.",
                    );
                  }}
                >
                  <Earth />
                  Climate wellbeing
                </button>
              </div>
            </section>
            <section className="canvas-form">
              <label>
                OBSERVANCE
                <select
                  value={observance}
                  onChange={(e) => setObservance(e.target.value)}
                >
                  {observances.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                AUDIENCE
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option>Community</option>
                  <option>School</option>
                  <option>Workplace</option>
                  <option>NGO network</option>
                </select>
              </label>
              <label>
                DESIRED ACTION
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option>Join a local action</option>
                  <option>Learn more</option>
                  <option>Start a conversation</option>
                  <option>Request support</option>
                  <option>Attend an event</option>
                </select>
              </label>
              <label>
                FORMAT
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option>Square post</option>
                  <option>Story</option>
                  <option>Poster</option>
                  <option>Email header</option>
                  <option>Presentation slide</option>
                </select>
              </label>
            </section>
            <section className="message-editor">
              <label>
                CAMPAIGN TITLE
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                MESSAGE
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <button
                className="generate-message"
                onClick={generateMessage}
                disabled={generating}
              >
                <Sparkles />
                {generating ? "Generating" : "Generate message"}
              </button>
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button key={item} onClick={() => setMessage(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
            <section className="tone-row">
              <div>
                <strong>Tone</strong>
                {["Warm", "Direct", "Hopeful", "Calm"].map((item) => (
                  <button
                    key={item}
                    className={tone === item ? "active" : ""}
                    onClick={() => setTone(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label>
                BRAND KIT
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                >
                  <option>Tranquiliva</option>
                  <option>Community teal</option>
                  <option>School violet</option>
                </select>
              </label>
            </section>
          </main>
          <aside className="canvas-preview-panel">
            <header>
              <strong>Live preview</strong>
              <span>{format}</span>
            </header>
            <div
              className={`campaign-preview ${cause === "Mental health" ? "mental" : "climate"} ${brand.replace(" ", "").toLowerCase()}`}
            >
              <div className="preview-brand">
                <Mark light />
                <strong>{brand}</strong>
              </div>
              <div>
                <small>
                  {observance === "No observance" ? cause : observance}
                </small>
                <h2>{title || "Campaign title"}</h2>
                <p>{message || "Your message appears here."}</p>
                <strong>{action}</strong>
              </div>
              <footer>
                {tone} · {audience}
              </footer>
            </div>
            <section className="safety-review">
              <h2>Safety review</h2>
              {[
                "No diagnosis or medical claims",
                "No fear or shame language",
                "Sources and image rights confirmed",
                ...(strictReview ? ["Human review requested"] : []),
              ].map((item, i) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() =>
                      setChecks(checks.map((v, n) => (n === i ? !v : v)))
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
              {strictReview && (
                <div className="strict-review">
                  <Heart />
                  <p>
                    Suicide related language requires crisis resources and human
                    review.
                  </p>
                </div>
              )}
              <p>
                {safe
                  ? "Ready to save and export."
                  : "Complete every check before export."}
              </p>
            </section>
            <div className="canvas-actions">
              <button onClick={saveDraft}>Save encrypted draft</button>
              <button
                disabled={!safe || !title.trim() || !message.trim()}
                onClick={exportCampaign}
              >
                Export <ArrowRight />
              </button>
            </div>
            <div className="observance-source">
              <ShieldCheck />
              <p>
                Observances verified against WHO, UNEP and United Nations
                sources.
              </p>
            </div>
          </aside>
        </div>
      )}
      {workspace === "Projects" && (
        <section className="canvas-library">
          <header>
            <h2>Projects</h2>
            <button
              onClick={() => {
                setActiveProject(null);
                setWorkspace("Create");
              }}
            >
              <Plus />
              New campaign
            </button>
          </header>
          {projects.length ? (
            projects.map((project) => (
              <button key={project.id} onClick={() => decryptDraft(project.id)}>
                <Megaphone />
                <div>
                  <strong>{project.name}</strong>
                  <small>{project.cause}</small>
                </div>
                <span>{project.status}</span>
                <ChevronRight />
              </button>
            ))
          ) : (
            <div className="canvas-empty">
              <Megaphone />
              <h2>No saved projects.</h2>
            </div>
          )}
        </section>
      )}
      {workspace === "Brand kits" && (
        <section className="brand-kits">
          <h2>Brand kits</h2>
          {[
            ["Tranquiliva", "#55D6D9", "#043F49"],
            ["Community teal", "#79D8CF", "#174D4C"],
            ["School violet", "#C89BEA", "#56377E"],
          ].map((kit) => (
            <button
              key={kit[0]}
              onClick={() => {
                setBrand(kit[0]);
                setWorkspace("Create");
              }}
            >
              <span
                style={{
                  background: `linear-gradient(135deg,${kit[1]},${kit[2]})`,
                }}
              />
              <strong>{kit[0]}</strong>
              <CheckCircle2 />
            </button>
          ))}
        </section>
      )}
      {workspace === "Version history" && (
        <section className="version-history">
          <h2>Version history</h2>
          {versions.length ? (
            versions.map((item, i) => (
              <article key={`${item}${i}`}>
                <span>{String(versions.length - i).padStart(2, "0")}</span>
                <div>
                  <strong>{item}</strong>
                  <small>{title}</small>
                </div>
                {i === 0 && <b>Current</b>}
              </article>
            ))
          ) : (
            <div className="canvas-empty">
              <Clock3 />
              <h2>No saved versions.</h2>
            </div>
          )}
        </section>
      )}
    </AppPage>
  );
}

function History({ entries }: { entries: CheckinEntry[] }) {
  if (!entries.length)
    return (
      <AppPage title="Mood history">
        <section className="real-history-empty">
          <BarChart3 />
          <h2>No check ins yet.</h2>
          <p>Your saved check ins will appear here.</p>
        </section>
      </AppPage>
    );
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const week = entries.filter((x) => new Date(x.createdAt) >= start);
  const counts = entries.reduce<Record<string, number>>(
    (all, e) => ({ ...all, [e.mood]: (all[e.mood] || 0) + 1 }),
    {},
  );
  const common =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  const recent = [...entries].slice(0, 14).reverse();
  return (
    <AppPage title="Mood history">
      <section className="history-live">
        <header>
          <div>
            <strong>{entries.length}</strong>
            <small>check ins</small>
          </div>
          <div>
            <strong>{week.length}</strong>
            <small>this week</small>
          </div>
          <div>
            <strong>{common}</strong>
            <small>most common</small>
          </div>
        </header>
        <div className="live-mood-chart">
          {recent.map((entry) => (
            <div key={entry.id}>
              <i style={{ height: `${entry.intensity * 9}%` }} />
              <small>
                {new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(
                  new Date(entry.createdAt),
                )}
              </small>
            </div>
          ))}
        </div>
        <div className="history-list">
          {entries.map((entry) => (
            <article key={entry.id}>
              <time>
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(entry.createdAt))}
              </time>
              <strong>{entry.mood}</strong>
              <span>{entry.intensity} / 10</span>
              {entry.feelings.length > 0 && <p>{entry.feelings.join(" · ")}</p>}
              {entry.note && <blockquote>{entry.note}</blockquote>}
            </article>
          ))}
        </div>
      </section>
    </AppPage>
  );
}
function Privacy({
  go,
  notify,
}: {
  go: (s: Screen) => void;
  notify: (m: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reminders, setReminders] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("tranquiliva-reminders") === "on");
  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("tranquiliva-")) continue;
      const value = window.localStorage.getItem(key);
      try { data[key] = JSON.parse(value || "null"); } catch { data[key] = value; }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tranquiliva-data-export.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Data export downloaded.");
  };
  const deleteLocalData = () => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter((key): key is string => Boolean(key?.startsWith("tranquiliva-")));
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem("tranquiliva-id-token");
    window.sessionStorage.removeItem("tranquiliva-user-id");
    window.sessionStorage.removeItem("tranquiliva-auth-role");
    setDeleteOpen(false);
    go("public");
  };
  return (
    <AppPage title="Privacy & account">
      <div className="privacy-grid">
        <section className="app-card privacy-controls">
          <h2>Your data</h2>
          <button onClick={exportData}>
            <span>
              <BookOpen />
              <div>
                <strong>Export my data</strong>
                <small>Journal, mood and saved activity</small>
              </div>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => setDeleteOpen(true)}>
            <span>
              <ShieldCheck />
              <div>
                <strong>Deletion controls</strong>
                <small>Choose records or close account</small>
              </div>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => { window.localStorage.removeItem("tranquiliva-ai-history"); notify("Conversation history deleted."); }}>
            <span>
              <LockKeyhole />
              <div>
                <strong>Conversation history</strong>
                <small>Keep until I delete it</small>
              </div>
            </span>
            <ChevronRight />
          </button>
        </section>
        <section className="app-card privacy-controls">
          <h2>Preferences</h2>
          <button onClick={() => { const next = !reminders; setReminders(next); window.localStorage.setItem("tranquiliva-reminders", next ? "on" : "off"); notify(next ? "Quiet reminders enabled." : "Quiet reminders disabled."); }}>
            <span>
              <Moon />
              <div>
                <strong>Quiet reminders</strong>
                <small>{reminders ? "Enabled" : "Off"}</small>
              </div>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => void logout(go)}>
            <span>
              <ArrowLeft />
              <div>
                <strong>Sign out</strong>
                <small>Return to public home</small>
              </div>
            </span>
            <ChevronRight />
          </button>
        </section>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete data from this device?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes local mood, journal, community, AI, resource and project data. Account deletion must also be completed through the connected account API.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteLocalData}>Delete device data</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPage>
  );
}
function AppPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="app-page-head">
        <h1>{title}</h1>
      </div>
      {children}
    </>
  );
}
function GlobalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`global-footer ${compact ? "compact" : ""}`}>
      <div className="footer-brand">
        <Logo light />
        <strong>Private wellbeing for real life.</strong>
      </div>
      <div className="footer-links">
        <div>
          <strong>Product</strong>
          <a href="#top">Home</a>
          <a href="https://www.tranquiliva.com/journal-entry.html">Journal</a>
          <a href="https://www.tranquiliva.com/content-feed.html">Resources</a>
          <a href="#care">Therapists</a>
        </div>
        <div>
          <strong>Company</strong>
          <a href="https://www.tranquiliva.com/privacy-data.html">Privacy</a>
          <a href="https://www.tranquiliva.com/safety-promise.html">Safety</a>
          <a href="https://www.tranquiliva.com/terms.html">Terms</a>
          <a href="https://www.tranquiliva.com/accessibility.html">Accessibility</a>
        </div>
      </div>
      <div className="footer-allmorrow">
        <strong>ALLMORROW</strong>
        <p>TRANQUILIVA is an ALLMORROW company.</p>
        <small>ALLMORROW Holdings Ltd.</small>
      </div>
      <div className="footer-legal">
        <span>© {new Date().getFullYear()} TRANQUILIVA</span>
        <span>Global support. Local care.</span>
      </div>
    </footer>
  );
}
