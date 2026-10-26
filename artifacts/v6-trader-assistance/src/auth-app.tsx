import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import App from "./App";
import { AboutUsPage, LandingPage } from "./pages/public-pages";
import {
  SignInPage,
  SignUpPage,
  appearance,
  basePath,
  clerkPubKey,
  clerkProxyUrl,
} from "./pages/clerk-auth-pages";
import { claimLegacyAccountData } from "./lib/account-storage";

const dashboardPath = `${basePath}/dashboard` || "/dashboard";
const signInPath = `${basePath}/sign-in` || "/sign-in";
const signUpPath = `${basePath}/sign-up` || "/sign-up";
const signInRoute = "/sign-in";
const dashboardSections = new Set([
  "Chat",
  "Market Analysis",
  "Chart Analysis",
  "Trade Journal",
  "Strategies & Code",
  "News & Research",
  "Education",
  "Backtesting",
  "Settings",
]);

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY for V6 authentication.");
}

function getRedirectUrl(): string {
  const candidate = new URLSearchParams(window.location.search).get("redirect_url");
  const fallback = dashboardPath;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    (basePath !== "" &&
      candidate !== basePath &&
      !candidate.startsWith(`${basePath}/`))
  ) {
    return fallback;
  }
  return candidate;
}

function LoadingScreen() {
  return (
    <main
      role="status"
      aria-label="Loading V6 Trader Assistance"
      style={{
        display: "grid",
        minHeight: "100dvh",
        placeItems: "center",
        background: "#060914",
        color: "#bba2ff",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: 12,
        letterSpacing: ".08em",
      }}
    >
      V6 TRADER ASSISTANCE
    </main>
  );
}

function PublicHome() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [showAbout, setShowAbout] = useState(false);

  if (isLoaded && isSignedIn) return <Redirect to="/dashboard" />;
  if (showAbout) return <AboutUsPage onBack={() => setShowAbout(false)} />;

  return (
    <LandingPage
      onGetStarted={() => setLocation("/dashboard")}
      onAboutUs={() => setShowAbout(true)}
      onAccountAction={(action) => {
        const destination = encodeURIComponent(dashboardPath);
        setLocation(
          `${action === "Sign Up" ? "/sign-up" : "/sign-in"}?redirect_url=${destination}`,
        );
      }}
      onOpenFeature={(section) =>
        setLocation(`/dashboard?section=${encodeURIComponent(section)}`)
      }
    />
  );
}

function ProtectedWorkspace() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const [preparedUserId, setPreparedUserId] = useState("");
  const section = new URLSearchParams(window.location.search).get("section");
  const initialSection =
    section && dashboardSections.has(section) ? section : undefined;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    claimLegacyAccountData(userId);
    setPreparedUserId(userId);
  }, [isLoaded, isSignedIn, userId]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn || !userId) {
    const currentLocation = `${window.location.pathname}${window.location.search}`;
    const redirectUrl = currentLocation.startsWith(`${basePath}/`)
      ? currentLocation
      : dashboardPath;
    return (
      <Redirect
        to={`${signInRoute}?redirect_url=${encodeURIComponent(redirectUrl)}`}
      />
    );
  }
  if (preparedUserId !== userId) return <LoadingScreen />;

  return (
    <App
      key={userId}
      userId={userId}
      initialSection={initialSection}
      onLogout={() => {
        void signOut({ redirectUrl: basePath || "/" });
      }}
    />
  );
}

function SignInRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <SignInPage redirectUrl={getRedirectUrl()} />;
}

function SignUpRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <SignUpPage redirectUrl={getRedirectUrl()} />;
}

function ClerkRouter() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) =>
    basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || "/"
      : path;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={signInPath}
      signUpUrl={signUpPath}
      afterSignOutUrl={basePath || "/"}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your V6 workspace",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with V6 Trader Assistance",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={PublicHome} />
        <Route path="/sign-in/*?" component={SignInRoute} />
        <Route path="/sign-up/*?" component={SignUpRoute} />
        <Route component={ProtectedWorkspace} />
      </Switch>
    </ClerkProvider>
  );
}

export default function AuthApplication() {
  return (
    <WouterRouter base={basePath}>
      <ClerkRouter />
    </WouterRouter>
  );
}
