import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { Navigation } from './components/Navigation';
import { Call115Modal } from './components/Call115Modal';
import { LoginModal } from './features/auth/LoginModal';
import { HomeView } from './features/home/HomeView';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-split active heavy routes with lazyWithRetry to recover from transient chunk loading errors
const RealEmergencyView = lazyWithRetry(() =>
  import('./features/emergency/RealEmergencyView').then((m) => ({ default: m.RealEmergencyView }))
);
const TrainingSessionView = lazyWithRetry(() =>
  import('./features/training/TrainingSessionView').then((m) => ({ default: m.TrainingSessionView }))
);
const ResultsView = lazyWithRetry(() =>
  import('./features/training/ResultsView').then((m) => ({ default: m.ResultsView }))
);
const LibraryView = lazyWithRetry(() =>
  import('./features/library/LibraryView').then((m) => ({ default: m.LibraryView }))
);
const NearbyFacilitiesView = lazyWithRetry(() =>
  import('./features/nearby/NearbyFacilitiesView').then((m) => ({ default: m.NearbyFacilitiesView }))
);
const CommunityView = lazyWithRetry(() =>
  import('./features/community/CommunityView').then((m) => ({ default: m.CommunityView }))
);
const OrganizationDashboardView = lazyWithRetry(() =>
  import('./features/organization/OrganizationDashboardView').then((m) => ({ default: m.OrganizationDashboardView }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-[#667085]">
    <div className="w-8 h-8 border-3 border-[#D92D20] border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-medium">Đang tải dữ liệu mô-đun...</span>
  </div>
);

export const App: React.FC = () => {
  const [isCall115Open, setIsCall115Open] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
          <Navigation
            onOpenCall115={() => setIsCall115Open(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
          />

          <main className="flex-1">
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<HomeView onOpenCall115={() => setIsCall115Open(true)} />} />
                  <Route path="/emergency" element={<RealEmergencyView />} />
                  <Route path="/training" element={<TrainingSessionView />} />
                  <Route path="/results" element={<ResultsView />} />
                  <Route path="/nearby" element={<NearbyFacilitiesView />} />
                  <Route path="/community" element={<CommunityView />} />
                  <Route path="/library" element={<LibraryView />} />
                  <Route path="/volunteer" element={<Navigate to="/" replace />} />
                  <Route path="/volunteers" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard" element={<OrganizationDashboardView />} />
                  <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </main>

          {/* Global Modals */}
          <Call115Modal
            isOpen={isCall115Open}
            onClose={() => setIsCall115Open(false)}
            incidentTypeHint="Liên hệ khẩn cấp tổng đài 115"
          />

          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
