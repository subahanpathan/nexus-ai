import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "./pages/home";
import Chat from "./pages/chat";
import Settings from "./pages/settings";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";

const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Point the API client at the backend server
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
setBaseUrl(apiBaseUrl);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error(
    "Missing Clerk publishable key. " +
      "Set VITE_CLERK_PUBLISHABLE_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Vercel: " +
      "Project Settings → Environment Variables.",
  );
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(0, 0%, 98%)",
    colorBackground: "hsl(0, 0%, 7%)",
    colorInputBackground: "hsl(0, 0%, 14%)",
    colorInputText: "hsl(0, 0%, 98%)",
    fontFamily: '"Inter", sans-serif',
  },
  elements: {
    cardBox:
      "w-[440px] max-w-full overflow-hidden bg-zinc-950 border border-zinc-800 rounded-xl",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/chat" />
      </Show>

      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;

      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }

      prevUserIdRef.current = userId;
    });

    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

/**
 * Wires Clerk's getToken() into the API client so every request
 * automatically includes an Authorization: Bearer <token> header.
 * This is required for cross-origin requests (5173 → 8080).
 *
 * Uses useLayoutEffect so the getter is registered BEFORE react-query
 * fires its first fetch on mount — preventing a 401 on the first render.
 */
function ClerkAuthTokenSetup() {
  const { getToken, isSignedIn } = useAuth();

  // Register eagerly with useLayoutEffect (runs sync before paint/queries)
  useLayoutEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}

const queryClient = new QueryClient();

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkAuthTokenSetup />

        <ThemeProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRedirect} />

              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />

              <Route path="/chat">
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </Route>

              <Route path="/chat/:id">
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </Route>

              <Route path="/settings">
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              </Route>

              <Route path="/admin">
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              </Route>

              <Route component={NotFound} />
            </Switch>

            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
