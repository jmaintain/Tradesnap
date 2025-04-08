import { Switch, Route, useLocation, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import AllTrades from "@/pages/AllTrades";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Journal from "@/pages/Journal";
import Landing from "@/pages/Landing";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  BarChart3, 
  ClipboardList, 
  BookOpen, 
  PieChart, 
  Settings as SettingsIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { StorageProvider } from "@/lib/indexedDB/StorageContext";
import { apiRequestAdapter } from "@/lib/apiAdapter";

interface VerifyStatusResponse {
  verified: boolean;
  status?: string;
  message: string;
}

// The main app component that decides which experience to show
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StorageProvider>
        <AppRouter />
        <Toaster />
      </StorageProvider>
    </QueryClientProvider>
  );
}

// Router that handles all routing decisions
function AppRouter() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [location] = useLocation();
  
  useEffect(() => {
    const checkVerification = async () => {
      try {
        // Check for stored email in local storage
        const email = localStorage.getItem('userEmail');
        
        // If no email is stored, user is not verified
        if (!email) {
          setIsVerifying(false);
          return;
        }
        
        // Check email verification status
        const response = await apiRequestAdapter<VerifyStatusResponse>(
          `/api/verify-status?email=${encodeURIComponent(email)}`
        );
        
        if (response.verified) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Failed to verify email status:', error);
      } finally {
        setIsVerifying(false);
      }
    };
    
    checkVerification();
  }, []);
  
  // Show loading indicator while verifying
  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // For Landing page OR when not verified, don't show the main app UI
  // But allow direct access to /dashboard and other app routes for users coming from email verification
  if (!isVerified && (location === "/" || location === "/landing")) {
    return <Landing />;
  }
  
  // Otherwise show the authenticated app UI with sidebar
  return <AuthenticatedLayout />;
}

// Authenticated app layout with sidebar and main content area
function AuthenticatedLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75" onClick={toggleMobileMenu}></div>
          <div className="relative flex flex-col w-full max-w-xs h-full bg-gray-800 pt-5 pb-4">
            <div className="absolute top-0 right-0 p-1">
              <Button 
                variant="ghost" 
                className="flex items-center justify-center h-10 w-10 text-gray-300 hover:text-white"
                onClick={toggleMobileMenu}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4 mb-4">
              <span className="h-8 w-auto text-white text-xl font-bold">TradeSnap</span>
            </div>
            <div className="flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                <a href="/dashboard" className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${location === '/dashboard' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                  <div className={`mr-3 ${location === '/dashboard' ? 'text-gray-300' : 'text-gray-400'}`}>
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  Dashboard
                </a>
                <a href="/trades" className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${location === '/trades' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                  <div className={`mr-3 ${location === '/trades' ? 'text-gray-300' : 'text-gray-400'}`}>
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  Trades
                </a>
                <a href="/journal" className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${location === '/journal' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                  <div className={`mr-3 ${location === '/journal' ? 'text-gray-300' : 'text-gray-400'}`}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                  Journal
                </a>
                <a href="/analytics" className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${location === '/analytics' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                  <div className={`mr-3 ${location === '/analytics' ? 'text-gray-300' : 'text-gray-400'}`}>
                    <PieChart className="h-6 w-6" />
                  </div>
                  Analytics
                </a>
                <a href="/settings" className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${location === '/settings' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                  <div className={`mr-3 ${location === '/settings' ? 'text-gray-300' : 'text-gray-400'}`}>
                    <SettingsIconWrapper className="h-6 w-6" />
                  </div>
                  Settings
                </a>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="relative z-10 flex items-center h-16 flex-shrink-0 border-b border-gray-200 bg-white md:hidden">
          <Button
            variant="ghost"
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center">
              <ChartLine className="h-6 w-6 text-blue-500 mr-2" />
              <span className="font-semibold text-gray-900">TradeSnap</span>
            </div>
          </div>
          <div className="px-4">
            <div className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 text-white">
              <Mail className="h-4 w-4" />
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/trades" component={AllTrades} />
            <Route path="/journal" component={Journal} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings" component={Settings} />
            <Route component={Dashboard} /> {/* Default to Dashboard for any unmatched routes */}
          </Switch>
        </main>
      </div>
    </div>
  );
}

// SVG icons for mobile header to avoid importing Lucide components again
const ChartLine = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const Mail = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

// Wrapper for the Settings icon to fix type errors
const SettingsIconWrapper = ({ className }: { className?: string }) => (
  <SettingsIcon className={className} />
);

export default App;
