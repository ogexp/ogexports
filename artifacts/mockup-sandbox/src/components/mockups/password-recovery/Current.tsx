import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import "./_group.css";

const titles = [
  "Reset your password",
  "Enter your email code",
  "Choose a new password",
  "Password updated",
];

export function Current() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmit =
    step === 0
      ? Boolean(email.trim())
      : step === 1
        ? code.length === 6
        : password.length >= 8 && Boolean(confirmPassword);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      if (password.length < 8) {
        setError("Use at least 8 characters for your new password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
      setStep(3);
    }
  }

  function goBack() {
    setError("");
    setNotice("");
    setStep((current) => Math.max(0, current - 1));
  }

  const description =
    step === 0
      ? "Enter the email address on your account. We’ll send a reset code there."
      : step === 3
        ? "You can now sign in with your new password."
        : `Reset code sent to: ${email}`;

  return (
    <main className="password-recovery-current">
      <header className="recovery-native-header">
        <button type="button" aria-label="Go back" onClick={goBack}>
          <ArrowLeft size={23} strokeWidth={2} />
        </button>
        <span>Reset password</span>
        <span className="recovery-header-spacer" aria-hidden="true" />
      </header>

      <section className="recovery-current-content" aria-live="polite">
        <div className="recovery-current-heading">
          {step === 3 ? (
            <span className="recovery-success-icon" aria-hidden="true">
              <CheckCircle2 size={25} />
            </span>
          ) : null}
          <h1>{titles[step]}</h1>
          <p>{description}</p>
        </div>

        {step < 3 ? (
          <form className="recovery-current-card" onSubmit={submit}>
            {step === 0 ? (
              <label className="recovery-current-field">
                <span>Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : null}
            {step === 1 ? (
              <label className="recovery-current-field">
                <span>Six-digit verification code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
              </label>
            ) : null}
            {step === 2 ? (
              <>
                <label className="recovery-current-field">
                  <span>New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label className="recovery-current-field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter the password again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            {notice ? <p className="recovery-current-notice">{notice}</p> : null}
            {error ? <p className="recovery-current-error">{error}</p> : null}
            <button
              className="recovery-current-primary"
              type="submit"
              disabled={!canSubmit}
            >
              {step === 0
                ? "Send code"
                : step === 1
                  ? "Verify code"
                  : "Update password"}
            </button>
            {step === 1 ? (
              <button
                className="recovery-current-resend"
                type="button"
                onClick={() =>
                  setNotice(
                    "If the account exists, a reset code has been sent to its email address.",
                  )
                }
              >
                Resend code
              </button>
            ) : null}
          </form>
        ) : (
          <div className="recovery-current-card recovery-current-complete">
            <p>
              Your password has been updated. Sign in with the new password to
              continue.
            </p>
            <button
              className="recovery-current-primary"
              type="button"
              onClick={() => setStep(0)}
            >
              <span>Back to sign in</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>

      <style>{`
        .recovery-native-header {
          height: 64px;
          display: grid;
          grid-template-columns: 44px 1fr 44px;
          align-items: center;
          padding: 0 18px;
          color: #283833;
          background: rgba(248, 247, 243, 0.94);
          border-bottom: 1px solid rgba(40, 56, 51, 0.08);
          box-shadow: 0 2px 8px rgba(40, 56, 51, 0.04);
          font-size: 17px;
          font-weight: 600;
          text-align: center;
        }
        .recovery-native-header button {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          color: #0a3335;
          background: transparent;
        }
        .recovery-header-spacer { width: 38px; }
        .recovery-current-content {
          min-height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 30px 22px 32px;
        }
        .recovery-current-heading { margin-bottom: 20px; }
        .recovery-current-heading h1 {
          margin: 0;
          color: #283833;
          font-size: 27px;
          line-height: 1.22;
          font-weight: 700;
          letter-spacing: -0.45px;
        }
        .recovery-current-heading p {
          margin: 9px 0 0;
          color: #52665f;
          font-size: 16px;
          line-height: 1.4;
        }
        .recovery-success-icon {
          display: inline-flex;
          margin-bottom: 12px;
          color: #0a6d66;
        }
        .recovery-current-card {
          width: 100%;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(253, 253, 251, 0.83), rgba(247, 235, 210, 0.50));
          box-shadow: 0 8px 24px rgba(10, 51, 53, 0.08), inset 0 1px rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
        }
        .recovery-current-field { display: block; margin-bottom: 14px; }
        .recovery-current-field > span {
          display: block;
          margin-bottom: 8px;
          color: #283833;
          font-size: 13px;
          line-height: 1.3;
          font-weight: 600;
        }
        .recovery-current-field input {
          display: block;
          width: 100%;
          min-height: 52px;
          padding: 0 15px;
          border: 1px solid #dfddd7;
          border-radius: 12px;
          outline: none;
          color: #283833;
          background: rgba(253, 253, 251, 0.92);
          font: inherit;
          font-size: 16px;
        }
        .recovery-current-field input:focus {
          border-color: #0a3335;
          box-shadow: 0 0 0 3px rgba(10, 51, 53, 0.12);
        }
        .recovery-current-field input::placeholder { color: #788780; opacity: 1; }
        .recovery-current-primary {
          width: 100%;
          min-height: 54px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          margin-top: 4px;
          padding: 0 18px;
          border: 1px solid #0a3335;
          border-radius: 12px;
          color: #f9f8f6;
          background: #0a3335;
          font: inherit;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 160ms ease, transform 160ms ease;
        }
        .recovery-current-primary:active { transform: scale(0.99); }
        .recovery-current-primary:disabled {
          border-color: #8b9c95;
          color: rgba(255, 255, 255, 0.68);
          background: #8b9c95;
          cursor: not-allowed;
        }
        .recovery-current-resend {
          width: 100%;
          min-height: 46px;
          margin-top: 8px;
          border: 0;
          color: #0a3335;
          background: transparent;
          font: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }
        .recovery-current-notice, .recovery-current-error {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.4;
        }
        .recovery-current-notice { color: #0a6d66; }
        .recovery-current-error { color: #b54743; }
        .recovery-current-complete p {
          margin: 0 0 16px;
          color: #52665f;
          font-size: 15px;
          line-height: 1.45;
        }
        @media (max-width: 360px) {
          .recovery-current-content { padding-right: 18px; padding-left: 18px; }
          .recovery-current-card { padding: 17px; }
          .recovery-current-heading h1 { font-size: 25px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .recovery-current-primary { transition: none; }
        }
      `}</style>
    </main>
  );
}
