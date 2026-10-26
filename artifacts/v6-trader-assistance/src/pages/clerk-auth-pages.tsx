import { SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import type { ReactNode } from "react";
import "./clerk-auth-pages.css";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const logoImageUrl = `${window.location.origin}${basePath}/logo.svg`;

export const appearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#8f69e8",
    colorForeground: "#eeedf7",
    colorMutedForeground: "#9ca6bc",
    colorDanger: "#e9899d",
    colorBackground: "#0b1020",
    colorInput: "#080d19",
    colorInputForeground: "#f0eff7",
    colorNeutral: "#39425b",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "6px",
  },
  elements: {
    rootBox: {
      width: "100%",
      display: "flex",
      justifyContent: "center",
    },
    cardBox: {
      width: "min(100%, 430px)",
      background: "#0b1020",
      border: "1px solid rgba(134, 151, 190, 0.2)",
      borderRadius: "9px",
      boxShadow: "0 28px 80px rgba(0, 0, 0, 0.38)",
      overflow: "hidden",
    },
    card: {
      width: "100%",
      background: "transparent",
      border: "0",
      borderRadius: "0",
      boxShadow: "none",
    },
    footer: {
      background: "transparent",
      border: "0",
      boxShadow: "none",
    },
    headerTitle: {
      color: "#f1f1f8",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "22px",
      fontWeight: "650",
      letterSpacing: "-0.04em",
    },
    headerSubtitle: {
      color: "#9ca6bc",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      lineHeight: "1.65",
    },
    socialButtonsBlockButton: {
      background: "#10172a",
      border: "1px solid rgba(134, 151, 190, 0.22)",
      borderRadius: "5px",
      boxShadow: "none",
      color: "#e8e9f2",
      minHeight: "42px",
    },
    socialButtonsBlockButtonText: {
      color: "#e8e9f2",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      fontWeight: "550",
    },
    formFieldLabel: {
      color: "#c5cada",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "12px",
      fontWeight: "550",
    },
    formFieldInput: {
      background: "#080d19",
      border: "1px solid rgba(134, 151, 190, 0.25)",
      borderRadius: "5px",
      color: "#f0eff7",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      minHeight: "42px",
      boxShadow: "none",
    },
    formButtonPrimary: {
      background: "linear-gradient(130deg, #7954ce, #5940a1)",
      border: "1px solid #9673e7",
      borderRadius: "5px",
      color: "#ffffff",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      fontWeight: "650",
      minHeight: "43px",
      boxShadow: "0 8px 24px rgba(92, 59, 170, 0.2)",
    },
    footerAction: {
      background: "transparent",
    },
    footerActionText: {
      color: "#9ca6bc",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "12px",
    },
    footerActionLink: {
      color: "#c2aaff",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "12px",
      fontWeight: "600",
      textDecoration: "none",
    },
    dividerLine: {
      background: "rgba(134, 151, 190, 0.2)",
    },
    dividerText: {
      color: "#7f8aa2",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "11px",
    },
    formFieldSuccessText: {
      color: "#72cdb8",
    },
    alert: {
      background: "rgba(145, 54, 77, 0.14)",
      border: "1px solid rgba(233, 137, 157, 0.32)",
      borderRadius: "5px",
    },
    alertText: {
      color: "#f2b3bf",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "12px",
    },
    logoBox: {
      border: "1px solid rgba(178, 146, 255, 0.32)",
      borderRadius: "10px 4px 10px 4px",
      background: "rgba(102, 68, 179, 0.12)",
    },
    logoImage: {
      objectFit: "contain",
    },
    identityPreviewEditButton: {
      color: "#c2aaff",
    },
    otpCodeFieldInput: {
      background: "#080d19",
      border: "1px solid rgba(134, 151, 190, 0.25)",
      borderRadius: "5px",
      color: "#f0eff7",
    },
    formFieldRow: {
      gap: "6px",
    },
    main: {
      gap: "18px",
    },
  },
};

type AuthPageProps = {
  redirectUrl: string;
};

function AuthPageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="v6-auth-page">
      <div className="v6-auth-grid" aria-hidden="true" />
      <header className="v6-auth-brand">
        <img src={logoImageUrl} alt="" />
        <span className="v6-auth-brand-copy">
          <strong>V6 TRADER ASSISTANCE</strong>
          <small>YOUR FUTURES TRADING WORKSPACE</small>
        </span>
      </header>

      <section className="v6-auth-content">
        <div className="v6-auth-intro">
          <span className="v6-auth-eyebrow"><i /> {eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="v6-auth-note">
            <span className="v6-auth-note-rule" />
            <span>Study carefully. Decide independently.</span>
          </div>
        </div>
        <div className="v6-auth-form">{children}</div>
      </section>

      <footer className="v6-auth-footer">
        <span>V6 TRADER ASSISTANCE</span>
        <span>FUTURES TRADING INVOLVES SUBSTANTIAL RISK</span>
      </footer>
    </main>
  );
}

export function SignInPage({ redirectUrl }: AuthPageProps) {
  return (
    <AuthPageFrame
      eyebrow="RETURN TO YOUR WORKSPACE"
      title="Welcome back."
      description="Sign in to continue your market study, strategy work, and trade review."
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
        appearance={appearance}
      />
    </AuthPageFrame>
  );
}

export function SignUpPage({ redirectUrl }: AuthPageProps) {
  return (
    <AuthPageFrame
      eyebrow="START WITH A CLEARER PROCESS"
      title="Create your account."
      description="Bring your preparation, learning, and performance review into one organized workspace."
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
        forceRedirectUrl={redirectUrl}
        appearance={appearance}
      />
    </AuthPageFrame>
  );
}
