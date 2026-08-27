import { StudyWorkspace } from "@/components/study-workspace";
import { ErrorBoundary } from "@/components/error-boundary";

export const dynamic = "force-dynamic";

// Mock data for demo without auth
const mockSubjects = [
  { id: "1", name: "Computer Science", description: "Algorithms, data structures, systems", created_at: "2024-01-15T10:00:00Z" },
  { id: "2", name: "Machine Learning", description: "Neural networks, deep learning, ML ops", created_at: "2024-01-20T14:30:00Z" },
  { id: "3", name: "Linear Algebra", description: "Vectors, matrices, eigenvalues", created_at: "2024-02-01T09:15:00Z" },
];

export default function DashboardPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="workspace-header" role="banner">
        <div className="container header-inner">
          <div className="brand" aria-label="MindForge home">
            <svg className="logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logo-text">MindForge</span>
          </div>

          <nav className="header-nav" aria-label="Workspace navigation">
            <span className="demo-badge">Guest</span>
          </nav>
        </div>
      </header>

      <main id="main-content" className="workspace-main" role="main">
        <ErrorBoundary>
          <StudyWorkspace initialSubjects={mockSubjects} />
        </ErrorBoundary>
      </main>

      <div id="toast-container" className="toast-container" role="region" aria-live="polite" aria-label="Notifications"></div>
    </>
  );
}
