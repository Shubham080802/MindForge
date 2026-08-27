import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="header" role="banner">
        <div className="container header-inner">
          <div className="brand" aria-label="MindForge home">
            <svg className="logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logo-text">MindForge</span>
          </div>
          <nav className="header-nav" aria-label="Main navigation">
            <Link href="/dashboard" className="btn btn-primary">Open Workspace</Link>
          </nav>
        </div>
      </header>

      <main id="main" role="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge" aria-label="New">
                <span className="badge-dot" aria-hidden="true"></span>
                <span>Now with AI-powered study workspace</span>
              </div>

              <h1 id="hero-title" className="hero-title">
                Your notes, made <span className="highlight">easier to return to</span>
              </h1>

              <p className="hero-description">
                Bring in the lecture notes you actually have. Ask when something doesn&apos;t land,
                practise what you know, and hear a clearer explanation when you need one.
              </p>

              <div className="hero-actions">
                <Link href="/dashboard" className="btn btn-primary btn-lg" aria-label="Create free account">
                  <span>Start Free</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link href="#features" className="btn btn-secondary btn-lg">
                  See how it works
                </Link>
              </div>

              <p className="hero-trust">
                Your materials stay in your private workspace. Nothing is kept in browser local storage.
              </p>

              <div className="hero-preview" aria-label="Workspace preview">
                <div className="preview-card">
                  <div className="preview-header">
                    <div className="preview-dots" aria-hidden="true">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                  <div className="preview-content">
                    <div className="preview-sidebar">
                      <div className="preview-item active" aria-hidden="true"></div>
                      <div className="preview-item" aria-hidden="true"></div>
                      <div className="preview-item" aria-hidden="true"></div>
                    </div>
                    <div className="preview-main">
                      <div className="preview-chat" aria-hidden="true">
                        <div className="preview-bubble user"></div>
                        <div className="preview-bubble assistant"></div>
                        <div className="preview-bubble user"></div>
                      </div>
                      <div className="preview-input" aria-hidden="true"></div>
                    </div>
                    <div className="preview-practice">
                      <div className="preview-quiz" aria-hidden="true"></div>
                      <div className="preview-quiz" aria-hidden="true"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features" aria-labelledby="features-title">
          <div className="container">
            <header className="section-header">
              <h2 id="features-title" className="section-title">Built for how you actually study</h2>
              <p className="section-description">
                Three core workflows in one private workspace. No context switching, no data leaving your control.
              </p>
            </header>

            <div className="features-grid">
              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="feature-title">Grounded Chat</h3>
                <p className="feature-description">
                  Ask questions about your uploaded materials. The tutor provides clear, verified explanations with exact source citations from your notes.
                </p>
                <ul className="feature-list">
                  <li>PDF, DOCX, TXT, MD support</li>
                  <li>Source citations on every answer</li>
                  <li>Text-to-speech playback</li>
                </ul>
              </article>

              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 12h6M9 15h4" />
                  </svg>
                </div>
                <h3 className="feature-title">Self-Check Quiz</h3>
                <p className="feature-description">
                  Generate AI-powered practice questions grounded in your materials. Get instant evaluation with detailed feedback on what you covered and what to review.
                </p>
                <ul className="feature-list">
                  <li>5 questions per session</li>
                  <li>AI evaluation with scoring</li>
                  <li>Key points & missing concepts</li>
                </ul>
              </article>

              <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="feature-title">Private by Default</h3>
                <p className="feature-description">
                  Your workspace is yours alone. End-to-end encryption at rest, no training on your data, and you control deletion. Built for privacy-first study.
                </p>
                <ul className="feature-list">
                  <li>Supabase row-level security</li>
                  <li>No browser localStorage</li>
                  <li>One-click data export/delete</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="workflow" aria-labelledby="workflow-title">
          <div className="container">
            <header className="section-header">
              <h2 id="workflow-title" className="section-title">How it works</h2>
              <p className="section-description">From notes to understanding in three steps</p>
            </header>

            <ol className="workflow-steps">
              <li className="workflow-step">
                <span className="step-number" aria-hidden="true">01</span>
                <div className="step-content">
                  <h3 className="step-title">Create a Subject</h3>
                  <p className="step-description">Organize your courses, projects, or topics. Each subject is an isolated workspace with its own materials and conversation history.</p>
                </div>
              </li>
              <li className="workflow-step">
                <span className="step-number" aria-hidden="true">02</span>
                <div className="step-content">
                  <h3 className="step-title">Upload Materials</h3>
                  <p className="step-description">Drag and drop PDFs, DOCX, Markdown, or text files. They&apos;re processed, indexed, and ready for grounded Q&A within seconds.</p>
                </div>
              </li>
              <li className="workflow-step">
                <span className="step-number" aria-hidden="true">03</span>
                <div className="step-content">
                  <h3 className="step-title">Study Smarter</h3>
                  <p className="step-description">Ask questions, generate practice quizzes, and get AI-evaluated feedback. Every answer cites your exact source material.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="cta" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta-card">
              <h2 id="cta-title" className="cta-title">Ready to build your study workspace?</h2>
              <p className="cta-description">Free to start. No credit card required. Cancel anytime.</p>
              <Link href="/dashboard" className="btn btn-primary btn-lg cta-btn">
                <span>Create Your Workspace</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="brand" aria-label="MindForge home">
                <svg className="logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect width="32" height="32" rx="8" fill="currentColor" />
                  <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="logo-text">MindForge</span>
              </div>
              <p className="footer-tagline">Your notes, made easier to return to.</p>
            </div>
            <nav className="footer-nav" aria-label="Footer navigation">
              <div className="footer-column">
                <h4>Product</h4>
                <ul>
                  <li><Link href="#features">Features</Link></li>
                  <li><Link href="/dashboard">Pricing</Link></li>
                  <li><Link href="/dashboard">Changelog</Link></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li><Link href="#">About</Link></li>
                  <li><Link href="#">Blog</Link></li>
                  <li><Link href="#">Careers</Link></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <ul>
                  <li><Link href="#">Privacy</Link></li>
                  <li><Link href="#">Terms</Link></li>
                  <li><Link href="#">Security</Link></li>
                </ul>
              </div>
            </nav>
          </div>
          <div className="footer-bottom">
            <p className="copyright" suppressHydrationWarning>© {new Date().getFullYear()} MindForge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}