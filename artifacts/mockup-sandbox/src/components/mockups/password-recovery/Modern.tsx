import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

const headings = [
  "Reset your password",
  "Enter your email code",
  "Choose a new password",
  "Password updated",
];

export function Modern() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

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
    } else if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
    } else if (password !== confirmPassword) {
      setError("The passwords do not match.");
    } else {
      setStep(3);
    }
  }

  function goBack() {
    setError("");
    setNotice("");
    setStep((current) => Math.max(0, current - 1));
  }

  function resendCode() {
    setError("");
    setNotice(
      "If the account exists, a reset code has been sent to its email address.",
    );
  }

  function returnToSignIn() {
    setSignedIn(true);
    setStep(0);
  }

  const description =
    step === 0
      ? "Enter the email address on your account. We’ll send a reset code there."
      : step === 3
        ? "You can now sign in with your new password."
        : `Reset code sent to: ${email}`;

  return (
    <main className="og-recovery">
      <style>{`
        .og-recovery {
          --paper: #f2f4ef;
          --surface: #fbfcf8;
          --ink: #243b37;
          --muted: #657873;
          --teal: #0a3335;
          --teal-soft: #e5efeb;
          --line: #dce5df;
          --gold: #b99a64;
          --error: #a94d47;
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(ellipse at 12% 6%, rgba(160, 198, 185, .30), transparent 34%),
            radial-gradient(ellipse at 88% 90%, rgba(214, 196, 154, .21), transparent 31%),
            var(--paper);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .og-recovery *, .og-recovery *::before, .og-recovery *::after { box-sizing: border-box; }
        .og-recovery-shell {
          width: min(100%, 1120px);
          min-height: 100vh;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          align-items: center;
          gap: clamp(38px, 8vw, 124px);
          padding: 36px clamp(22px, 7vw, 92px);
        }
        .og-brand-side { max-width: 430px; }
        .og-brand-lockup {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--teal);
        }
        .og-brand-mark {
          width: 42px; height: 42px; display: grid; place-items: center;
          border: 1px solid rgba(10,51,53,.17); border-radius: 14px;
          background: rgba(251,252,248,.56);
        }
        .og-brand-name { font-size: 12px; font-weight: 800; letter-spacing: .16em; }
        .og-brand-caption { margin-top: 3px; color: var(--muted); font-size: 11px; letter-spacing: .08em; }
        .og-story {
          position: relative; margin-top: 78px; padding-left: 24px;
          border-left: 1px solid rgba(10,51,53,.18);
        }
        .og-story-kicker {
          margin: 0 0 18px; color: #738a80; font-size: 10px;
          font-weight: 800; letter-spacing: .2em; text-transform: uppercase;
        }
        .og-story h2 {
          margin: 0; color: var(--teal); font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(36px, 4.3vw, 58px); font-weight: 400;
          letter-spacing: -.045em; line-height: 1.02;
        }
        .og-story p {
          max-width: 330px; margin: 20px 0 0; color: #667972;
          font-size: 15px; line-height: 1.7;
        }
        .og-assurance {
          display: flex; align-items: center; gap: 10px; margin-top: 30px;
          color: #536a62; font-size: 12px; font-weight: 650;
        }
        .og-assurance-icon {
          display: grid; place-items: center; width: 29px; height: 29px;
          border-radius: 50%; color: var(--teal); background: #e0ebe5;
        }
        .og-phone {
          width: 100%; min-height: 700px; overflow: hidden; position: relative;
          border: 1px solid rgba(10,51,53,.11); border-radius: 30px;
          background: rgba(248,250,246,.78);
          box-shadow: 0 28px 80px rgba(29,57,49,.13), 0 4px 12px rgba(29,57,49,.05);
          backdrop-filter: blur(14px);
          display: flex; flex-direction: column;
        }
        .og-native-header {
          height: 62px; flex: 0 0 62px; display: grid;
          grid-template-columns: 42px 1fr 42px; align-items: center;
          padding: 0 17px; border-bottom: 1px solid rgba(36,59,55,.075);
          color: var(--ink); text-align: center; font-size: 15px; font-weight: 650;
        }
        .og-back {
          border: 0; width: 38px; height: 38px; display: grid; place-items: center;
          border-radius: 50%; background: transparent; color: var(--teal); cursor: pointer;
        }
        .og-back:hover { background: rgba(10,51,53,.06); }
        .og-header-space { width: 38px; }
        .og-content {
          flex: 1; display: flex; flex-direction: column; justify-content: center;
          padding: 29px 25px 23px;
        }
        .og-step-meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 25px; color: #778982; font-size: 10px; font-weight: 750;
          letter-spacing: .12em; text-transform: uppercase;
        }
        .og-step-count { color: var(--teal); }
        .og-step-track {
          height: 3px; margin-top: 9px; overflow: hidden; border-radius: 4px;
          background: #dfe8e2;
        }
        .og-step-fill {
          height: 100%; border-radius: inherit; background: var(--gold);
          transition: width 260ms ease;
        }
        .og-icon-plate {
          width: 48px; height: 48px; display: grid; place-items: center;
          margin-bottom: 17px; border: 1px solid #d8e5dc; border-radius: 16px;
          color: var(--teal); background: linear-gradient(145deg, #eff5ef, #e2ece6);
        }
        .og-heading h1 {
          margin: 0; color: var(--teal); font-family: Georgia, "Times New Roman", serif;
          font-size: 31px; font-weight: 400; letter-spacing: -.035em; line-height: 1.14;
        }
        .og-heading p {
          margin: 10px 0 0; color: #697b75; font-size: 13px; line-height: 1.6;
          overflow-wrap: anywhere;
        }
        .og-form-card {
          margin-top: 23px; padding: 20px 18px 17px;
          border: 1px solid rgba(255,255,255,.92); border-radius: 20px;
          background: linear-gradient(150deg, rgba(255,255,252,.88), rgba(237,243,235,.8));
          box-shadow: 0 12px 28px rgba(21,58,49,.075), inset 0 1px rgba(255,255,255,.9);
        }
        .og-field { display: block; margin-bottom: 16px; }
        .og-field-label {
          display: block; margin: 0 0 8px; color: #40564f;
          font-size: 12px; font-weight: 700;
        }
        .og-input-wrap { position: relative; }
        .og-field input {
          display: block; width: 100%; height: 51px; padding: 0 14px;
          border: 1px solid #d9e2dc; border-radius: 12px; outline: none;
          background: rgba(253,254,250,.86); color: var(--ink);
          font: inherit; font-size: 15px; transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .og-field input::placeholder { color: #98a69f; opacity: 1; }
        .og-field input:focus {
          border-color: #4b7c70; box-shadow: 0 0 0 3px rgba(45,111,95,.11);
        }
        .og-input-with-icon { padding-left: 43px !important; }
        .og-input-icon {
          position: absolute; top: 50%; left: 14px; transform: translateY(-50%);
          color: #82958b; pointer-events: none;
        }
        .og-code-input {
          text-align: center; font-size: 23px !important; font-weight: 700 !important;
          letter-spacing: .42em; padding-left: 1em !important; font-variant-numeric: tabular-nums;
        }
        .og-password-toggle {
          position: absolute; top: 50%; right: 8px; transform: translateY(-50%);
          width: 36px; height: 36px; display: grid; place-items: center; border: 0;
          border-radius: 9px; color: #71857c; background: transparent; cursor: pointer;
        }
        .og-password-toggle:hover { background: #edf2ed; }
        .og-inline-note {
          display: flex; align-items: flex-start; gap: 8px; margin: -2px 0 15px;
          color: #466c60; font-size: 11px; line-height: 1.45;
        }
        .og-inline-note svg { flex: none; margin-top: 1px; }
        .og-notice, .og-error {
          margin: 0 0 12px; padding: 10px 11px; border-radius: 10px;
          font-size: 12px; line-height: 1.45;
        }
        .og-notice { color: #35695b; background: #e7f1eb; }
        .og-error { color: #913e39; background: #f8e9e5; }
        .og-primary {
          width: 100%; min-height: 51px; display: inline-flex; align-items: center;
          justify-content: center; gap: 9px; border: 1px solid var(--teal);
          border-radius: 12px; color: #f7f8f3; background: var(--teal);
          font: inherit; font-size: 14px; font-weight: 720; cursor: pointer;
          transition: transform 150ms ease, background 150ms ease, opacity 150ms ease;
        }
        .og-primary:not(:disabled):hover { background: #12484a; }
        .og-primary:not(:disabled):active { transform: scale(.99); }
        .og-primary:disabled { cursor: not-allowed; opacity: .46; }
        .og-resend {
          width: 100%; min-height: 42px; margin-top: 7px; border: 0;
          color: #326b61; background: transparent; font: inherit; font-size: 12px;
          font-weight: 720; cursor: pointer;
        }
        .og-resend:hover { text-decoration: underline; text-underline-offset: 3px; }
        .og-fine-print {
          display: flex; justify-content: center; align-items: center; gap: 6px;
          margin: 19px 0 0; color: #899790; font-size: 10px; letter-spacing: .015em;
        }
        .og-complete-mark {
          width: 58px; height: 58px; display: grid; place-items: center;
          margin-bottom: 18px; border: 1px solid #cfe1d4; border-radius: 20px;
          color: #1e6a59; background: #e3f0e7;
        }
        .og-complete-card p { margin: 0 0 20px; color: #667b73; font-size: 13px; line-height: 1.6; }
        .og-signin-icon {
          width: 52px; height: 52px; display: grid; place-items: center;
          margin-bottom: 18px; border-radius: 17px; color: var(--teal); background: var(--teal-soft);
        }
        .og-mobile-brand { display: none; }
        @media (max-width: 760px) {
          .og-recovery-shell {
            display: block; width: min(100%, 460px); min-height: 100dvh;
            padding: 0 0 22px;
          }
          .og-brand-side { display: none; }
          .og-phone {
            width: 100%; min-height: 100dvh; border: 0; border-radius: 0;
            box-shadow: none; background: rgba(248,250,246,.42);
          }
          .og-native-header { padding: 0 15px; }
          .og-content { padding: 23px 22px max(25px, env(safe-area-inset-bottom)); }
          .og-mobile-brand {
            display: flex; align-items: center; gap: 8px; margin: 0 0 21px;
            color: #70847b; font-size: 9px; font-weight: 800; letter-spacing: .15em;
          }
          .og-mobile-brand-mark {
            display: grid; place-items: center; width: 26px; height: 26px;
            border: 1px solid #d6e2da; border-radius: 9px; color: var(--teal);
          }
        }
        @media (max-width: 380px) {
          .og-content { padding-right: 18px; padding-left: 18px; }
          .og-form-card { padding: 18px 15px 15px; }
          .og-heading h1 { font-size: 29px; }
        }
        @media (max-height: 720px) and (min-width: 761px) {
          .og-phone { min-height: 650px; }
          .og-content { padding-top: 22px; padding-bottom: 18px; }
          .og-step-meta { margin-bottom: 16px; }
          .og-form-card { margin-top: 17px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .og-recovery *, .og-recovery *::before, .og-recovery *::after {
            scroll-behavior: auto !important; transition-duration: .01ms !important;
            animation-duration: .01ms !important; animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <div className="og-recovery-shell">
        <aside className="og-brand-side" aria-label="OG Exports">
          <div className="og-brand-lockup">
            <div className="og-brand-mark"><KeyRound size={19} strokeWidth={1.7} /></div>
            <div>
              <div className="og-brand-name">OG EXPORTS</div>
              <div className="og-brand-caption">INVESTOR RELATIONS</div>
            </div>
          </div>
          <div className="og-story">
            <p className="og-story-kicker">Account access</p>
            <h2>Your investments,<br />within reach.</h2>
            <p>A considered reset flow for the account that connects you to real trade opportunities.</p>
            <div className="og-assurance">
              <span className="og-assurance-icon"><ShieldCheck size={16} /></span>
              <span>Private, dependable account recovery</span>
            </div>
          </div>
        </aside>

        <section className="og-phone" aria-label="Password recovery">
          <header className="og-native-header">
            <button className="og-back" type="button" aria-label="Go back" onClick={signedIn ? () => setSignedIn(false) : goBack}>
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
            <span>Reset password</span>
            <span className="og-header-space" aria-hidden="true" />
          </header>

          {signedIn ? (
            <div className="og-content" aria-live="polite">
              <div className="og-mobile-brand">
                <span className="og-mobile-brand-mark"><KeyRound size={13} /></span> OG EXPORTS · INVESTOR
              </div>
              <div className="og-signin-icon"><CheckCircle2 size={25} /></div>
              <div className="og-heading">
                <h1>Ready to sign in</h1>
                <p>Your password has been updated. Sign in with your new password to continue.</p>
              </div>
              <div className="og-form-card og-complete-card">
                <button className="og-primary" type="button" onClick={() => setSignedIn(false)}>
                  Back to sign in <ArrowRight size={17} />
                </button>
              </div>
              <p className="og-fine-print"><LockKeyhole size={12} /> OG Exports investor account</p>
            </div>
          ) : (
            <div className="og-content" aria-live="polite">
              <div className="og-mobile-brand">
                <span className="og-mobile-brand-mark"><KeyRound size={13} /></span> OG EXPORTS · INVESTOR
              </div>
              <div className="og-step-meta">
                <div>
                  <span>ACCOUNT RECOVERY</span>
                  <div className="og-step-track" aria-hidden="true">
                    <div className="og-step-fill" style={{ width: `${step === 3 ? 100 : ((step + 1) / 3) * 100}%` }} />
                  </div>
                </div>
                <span className="og-step-count">{step === 3 ? "DONE" : `0${step + 1} / 03`}</span>
              </div>

              {step === 3 ? (
                <>
                  <div className="og-complete-mark"><Check size={28} strokeWidth={2.4} /></div>
                  <div className="og-heading">
                    <h1>{headings[step]}</h1>
                    <p>{description}</p>
                  </div>
                  <div className="og-form-card og-complete-card">
                    <p>Your password has been updated. Sign in with the new password to continue.</p>
                    <button className="og-primary" type="button" onClick={returnToSignIn}>
                      Back to sign in <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="og-icon-plate" aria-hidden="true">
                    {step === 0 ? <Mail size={22} strokeWidth={1.7} /> : step === 1 ? <ShieldCheck size={23} strokeWidth={1.7} /> : <LockKeyhole size={21} strokeWidth={1.7} />}
                  </div>
                  <div className="og-heading">
                    <h1>{headings[step]}</h1>
                    <p>{description}</p>
                  </div>

                  <form className="og-form-card" onSubmit={submit}>
                    {step === 0 && (
                      <label className="og-field">
                        <span className="og-field-label">Email address</span>
                        <span className="og-input-wrap">
                          <Mail className="og-input-icon" size={17} />
                          <input
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            aria-label="Email address"
                          />
                        </span>
                      </label>
                    )}
                    {step === 1 && (
                      <label className="og-field">
                        <span className="og-field-label">Six-digit verification code</span>
                        <input
                          className="og-code-input"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="000000"
                          value={code}
                          maxLength={6}
                          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          aria-label="Six-digit verification code"
                        />
                      </label>
                    )}
                    {step === 2 && (
                      <>
                        <label className="og-field">
                          <span className="og-field-label">New password</span>
                          <span className="og-input-wrap">
                            <LockKeyhole className="og-input-icon" size={16} />
                            <input
                              className="og-input-with-icon"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="At least 8 characters"
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              aria-label="New password"
                            />
                            <button className="og-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                          </span>
                        </label>
                        <label className="og-field">
                          <span className="og-field-label">Confirm new password</span>
                          <span className="og-input-wrap">
                            <LockKeyhole className="og-input-icon" size={16} />
                            <input
                              className="og-input-with-icon"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              placeholder="Enter the password again"
                              value={confirmPassword}
                              onChange={(event) => setConfirmPassword(event.target.value)}
                              aria-label="Confirm new password"
                            />
                          </span>
                        </label>
                        <p className="og-inline-note"><ShieldCheck size={14} /> Use at least 8 characters for your new password.</p>
                      </>
                    )}
                    {notice && <p className="og-notice" role="status">{notice}</p>}
                    {error && <p className="og-error" role="alert">{error}</p>}
                    <button className="og-primary" type="submit" disabled={!canSubmit}>
                      {step === 0 ? "Send code" : step === 1 ? "Verify code" : "Update password"}
                      <ArrowRight size={17} />
                    </button>
                    {step === 1 && <button className="og-resend" type="button" onClick={resendCode}>Resend code</button>}
                  </form>
                </>
              )}
              <p className="og-fine-print"><LockKeyhole size={12} /> A private step in your OG Exports account</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
