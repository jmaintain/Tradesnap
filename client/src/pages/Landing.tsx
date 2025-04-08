import React, { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, BarChart2, LineChart, Mail, PieChart, ShieldCheck, Zap, Heart } from 'lucide-react';
import { apiRequestAdapter } from '@/lib/apiAdapter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocation } from 'wouter';

// Define interface for our form data
interface EmailFormData {
  email: string;
}

// Response from the server
interface SubscribeResponse {
  email?: string;
  status?: string;
  message: string;
  verificationToken?: string;
  isDevelopment?: boolean;  // Added for development mode detection
}

const Landing: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Send the subscription to the backend
      const response = await apiRequestAdapter<SubscribeResponse>('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      // Save email in localStorage in all cases
      localStorage.setItem('userEmail', email);
      
      // Check for development mode auto-verification
      if (response.isDevelopment || response.message?.includes('DEV MODE')) {
        setIsRedirecting(true);
        toast({
          title: 'Verification successful!',
          description: 'Redirecting you to the application...',
        });
        
        // Redirect to app after a short delay using window.location for a hard redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
      // Check if already verified
      else if (response.status === 'active') {
        setIsRedirecting(true);
        toast({
          title: 'Welcome back!',
          description: 'Your email is already verified. Redirecting you to the application...',
        });
        
        // Redirect to app after a short delay using window.location for a hard redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } 
      // Standard verification email sent case
      else {
        toast({
          title: 'Verification email sent!',
          description: 'Please check your inbox and click the verification link.',
        });
        
        setShowVerificationAlert(true);
      }
      
      setEmail('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'There was a problem submitting your email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="py-6 px-4 sm:px-6 lg:px-8 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Logo size="sm" />
            <h1 className="text-xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">TradeSnap</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Trade Journaling should not be <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">hard or expensive</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl">
                TradeSnap is your personal trading journal where you manually record your trades, track performance, trading mood, and make data-driven decisions to improve your trading strategy.
              </p>
              
              {isRedirecting && (
                <Alert className="mt-6 border-green-200 bg-green-50">
                  <ArrowRight className="h-5 w-5 text-green-600 animate-pulse" />
                  <AlertTitle className="text-green-800">You're all set!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    <div className="flex items-center">
                      <span className="mr-2">Redirecting you to the application</span>
                      <span className="inline-flex space-x-1">
                        <span className="animate-bounce delay-0">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {showVerificationAlert && (
                <Alert className="mt-6 border-blue-200 bg-blue-50">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <AlertTitle className="text-blue-800">Check your email</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    We've sent a verification link to your email address. 
                    Please click the link to access TradeSnap.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-8">
                <form onSubmit={handleSubmit} className="max-w-md sm:flex sm:divide-x-0">
                  <div className="sm:flex-1">
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className="w-full rounded-md rounded-r-none"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="mt-3 sm:mt-0 w-full sm:w-auto rounded-l-none font-medium"
                    disabled={isSubmitting || isRedirecting}
                  >
                    {isSubmitting ? 'Submitting...' : isRedirecting ? 'Redirecting...' : 'Start TradeSnap'}
                    {!isSubmitting && !isRedirecting && <ArrowRight className="ml-2 h-4 w-4" />}
                    {isRedirecting && <span className="ml-2 animate-pulse">→</span>}
                  </Button>
                </form>
                <p className="mt-3 text-sm text-gray-500">
                  {showVerificationAlert 
                    ? "Don't see the email? Check your spam folder."
                    : "We're currently in beta testing. An email is required to use the app, but you won't receive any emails from us until we officially launch."}
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative h-96 w-full">
                <Logo size="xl" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 opacity-70 blur-3xl"></div>
                <div className="absolute inset-0 rounded-lg border border-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Features that empower your trading
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to track, analyze, and improve your trading performance.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Easy Trade Tracking</h3>
              <p className="mt-2 text-gray-600">
                Log trades with minimal fields. Include screenshots, notes, and journal entries.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart2 className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Automatic P&L Calculation</h3>
              <p className="mt-2 text-gray-600">
                P&L calculated automatically in both points and dollars based on instrument data.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Analytics & Insights</h3>
              <p className="mt-2 text-gray-600">
                Visualize your performance with charts and identify patterns to improve your strategy.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Offline Capability</h3>
              <p className="mt-2 text-gray-600">
                Works offline with local storage using IndexedDB for seamless trading journaling.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Fast & Responsive</h3>
              <p className="mt-2 text-gray-600">
                Built with performance in mind. Works on all your devices, from desktop to mobile.
              </p>
            </div>

            {/* Feature 6 - Simplicity */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Simplicity</h3>
              <p className="mt-2 text-gray-600">
                Designed with simplicity at its core. No complicated setup or steep learning curve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits/CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Better trades through daily reflection.
          </h2>
          <p className="mt-4 text-xl text-blue-100 max-w-2xl mx-auto">
            We're currently in beta testing. An email is required to use the app, but you won't receive any emails from us until we officially launch.
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="sm:flex sm:divide-x-0">
              <div className="sm:flex-1">
                <label htmlFor="cta-email" className="sr-only">Email address</label>
                <Input
                  id="cta-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full rounded-md rounded-r-none shadow-sm"
                  required
                />
              </div>
              <Button 
                type="submit" 
                variant="secondary" 
                className="mt-3 sm:mt-0 w-full sm:w-auto rounded-l-none shadow-sm font-medium"
                disabled={isSubmitting || isRedirecting}
              >
                {isSubmitting ? 'Submitting...' : isRedirecting ? 'Redirecting...' : 'Start TradeSnap'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Logo size="sm" className="mr-3" />
              <span className="font-bold text-xl">TradeSnap</span>
            </div>
            <div className="text-center">
              <div className="text-gray-300 text-sm mb-1">
                Made with <span className="text-red-500">❤</span> A Black-Owned Business
              </div>
              <div className="text-gray-400 text-sm">
                © {new Date().getFullYear()} TradeSnap. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;