import { useRef, useState } from 'react';
import { Starfield } from './Starfield';

interface Props {
  onLaunch: (input: string) => void;
  onDemo: () => void;
}

const EXAMPLES = [
  { display: 'vitejs/vite', value: 'github.com/vitejs/vite' },
  { display: 'expressjs/express', value: 'github.com/expressjs/express' },
  { display: 'axios/axios', value: 'github.com/axios/axios' },
];

export function LandingPage({ onLaunch, onDemo }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lpRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    const val = input.trim();
    if (val) onLaunch(val);
    else onDemo();
  };

  const scrollToInput = () => {
    lpRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 350);
  };

  return (
    <>
      <div className="lp-bg" aria-hidden="true">
        <Starfield count={300} nebulaVisible={true} />
      </div>

      <div className="lp" ref={lpRef}>
        {/* ── Nav ── */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <span className="logo-mark">✦</span>
            <span className="logo-text">Repo Galaxy</span>
            <span className="logo-beta">BETA</span>
          </div>
          <button className="lp-outline-btn" onClick={onDemo}>
            Try demo →
          </button>
        </nav>

        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-orbs" aria-hidden="true">
            <div className="lp-orb lp-orb-blue" />
            <div className="lp-orb lp-orb-purple" />
            <div className="lp-orb lp-orb-indigo" />
            <div className="lp-orb lp-orb-amber" />
            <div className="lp-orb lp-orb-green" />
            <div className="lp-orb lp-orb-pink" />
            <div className="lp-ring lp-ring-inner" />
            <div className="lp-ring lp-ring-outer" />
          </div>

          <div className="lp-hero-content">
            <span className="lp-pill">
              <span className="lp-pill-dot" />
              GitHub Repository Visualizer
            </span>

            <h1 className="lp-h1">
              Your code,<br />
              <span className="lp-grad">mapped as a galaxy</span>
            </h1>

            <p className="lp-lead">
              Transform any public GitHub repository into an interactive star map.
              Files become planets, folders become solar systems,
              dependencies become orbital paths.
            </p>

            <div className="lp-search-group">
              <div className="lp-search-bar">
                <span className="lp-search-prefix">github.com /</span>
                <input
                  ref={inputRef}
                  className="lp-search-input"
                  placeholder="owner / repo"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                />
                <button className="lp-search-btn" onClick={handleSubmit}>
                  LAUNCH ↗
                </button>
              </div>
              <div className="lp-examples">
                <span className="lp-examples-label">try:</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.display}
                    className="lp-example-chip"
                    onClick={() => onLaunch(ex.value)}
                  >
                    {ex.display}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lp-section">
          <h2 className="lp-section-h">Three ways to see your code</h2>
          <div className="lp-cards">
            <LpCard
              icon="⬡"
              accent="#3d5af1"
              title="Force-directed"
              body="Physics-based layout where closely related files cluster naturally. Dependencies pull nodes together, revealing hidden structure."
            />
            <LpCard
              icon="◎"
              accent="#7b9fff"
              title="Orbital"
              body="Files orbit their parent folders in concentric rings, giving a clear bird's-eye view of your repository's architectural layers."
            />
            <LpCard
              icon="✦"
              accent="#a78bfa"
              title="Constellation"
              body="Dependency lines trace constellations between files. Follow the import graph and understand exactly how your code flows."
            />
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="lp-section">
          <h2 className="lp-section-h">Up and running in seconds</h2>
          <div className="lp-steps">
            <LpStep
              n="01"
              title="Paste a GitHub URL"
              body="Enter any public repository — no sign-in or API token required."
            />
            <span className="lp-steps-sep" aria-hidden="true">→</span>
            <LpStep
              n="02"
              title="Watch it render"
              body="Repo Galaxy fetches the file tree and maps it into an interactive star system."
            />
            <span className="lp-steps-sep" aria-hidden="true">→</span>
            <LpStep
              n="03"
              title="Explore & share"
              body="Click files for details, filter by language, switch views, and copy a share link."
            />
          </div>
        </section>

        {/* ── Stat band ── */}
        <div className="lp-stat-band">
          <LpStat icon="🪐" value="20+" label="file types colorized" />
          <LpStat icon="⚡" value="750KB" label="analyzed per repo" />
          <LpStat icon="🔗" value="3" label="visualization modes" />
          <LpStat icon="🔒" value="Zero" label="sign-in required" />
        </div>

        {/* ── CTA ── */}
        <div className="lp-cta-band">
          <div className="lp-cta-inner">
            <h2 className="lp-cta-h">Ready to explore your galaxy?</h2>
            <div className="lp-cta-btns">
              <button className="lp-cta-primary" onClick={scrollToInput}>
                Map a repository ↗
              </button>
              <button className="lp-cta-ghost" onClick={onDemo}>
                View demo first
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <div className="lp-footer-brand">
            <span className="logo-mark" style={{ width: 22, height: 22, fontSize: 11, borderRadius: 6 }}>✦</span>
            <span>Repo Galaxy</span>
          </div>
          <span className="lp-footer-copy">Built with React + D3 · No sign-in required</span>
        </footer>
      </div>
    </>
  );
}

function LpCard({ icon, accent, title, body }: { icon: string; accent: string; title: string; body: string }) {
  return (
    <div className="lp-card" style={{ '--card-accent': accent } as React.CSSProperties}>
      <div className="lp-card-icon" style={{ color: accent, boxShadow: `0 0 28px ${accent}50` }}>
        {icon}
      </div>
      <h3 className="lp-card-title">{title}</h3>
      <p className="lp-card-body">{body}</p>
    </div>
  );
}

function LpStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="lp-step">
      <span className="lp-step-n">{n}</span>
      <h3 className="lp-step-title">{title}</h3>
      <p className="lp-step-body">{body}</p>
    </div>
  );
}

function LpStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="lp-stat">
      <span className="lp-stat-icon">{icon}</span>
      <span className="lp-stat-value">{value}</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  );
}
