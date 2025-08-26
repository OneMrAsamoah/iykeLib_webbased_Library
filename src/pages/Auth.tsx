import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface Session {
  user: User;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const defaultTab = params.get("tab") === "signup" ? "signup" : "signin";
  const { toast } = useToast();

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('user');
    const storedSession = localStorage.getItem('session');
    
    if (storedUser && storedSession) {
      try {
        const userData = JSON.parse(storedUser);
        const sessionData = JSON.parse(storedSession);
        
        // Verify session is still valid by checking with the server
        const checkSession = async () => {
          try {
            const response = await fetch('/api/auth/profile', {
              headers: {
                'x-user-email': userData.email,
              },
            });
            
            if (response.ok) {
              // Session is valid, set user data
              setSession(sessionData);
              setUser(userData);
              navigate("/");
            } else {
              // Session is invalid, clear localStorage
              localStorage.removeItem('user');
              localStorage.removeItem('session');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('userRole');
            }
          } catch (error) {
            console.error('Error checking session:', error);
            // On error, clear localStorage to be safe
            localStorage.removeItem('user');
            localStorage.removeItem('session');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
          }
        };
        
        checkSession();
      } catch (error) {
        console.error('Error parsing stored session:', error);
        // Clear invalid localStorage data
        localStorage.removeItem('user');
        localStorage.removeItem('session');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
      }
    }
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      // Create user object compatible with existing interface
      const userData: User = {
        id: data.user.id.toString(),
        email: data.user.email,
        user_metadata: {
          display_name: data.user.first_name || data.user.last_name || data.user.username || email.split('@')[0]
        }
      };

      const sessionData: Session = {
        user: userData
      };

      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('session', JSON.stringify(sessionData));
      localStorage.setItem('userEmail', data.user.email);
      
      // Store additional user data for admin functionality
      localStorage.setItem('userRole', data.user.role);
      if (data.user.role === 'admin') {
        localStorage.setItem(`admin_role_${data.user.email}`, 'admin');
      }

      setUser(userData);
      setSession(sessionData);

      // Dispatch custom event to notify useAuth hook
      window.dispatchEvent(new CustomEvent('signin', {
        detail: { user: userData, session: sessionData }
      }));

      toast({
        title: "Success",
        description: "Signed in successfully!",
      });

      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username, 
          email, 
          password, 
          first_name: displayName || null, 
          last_name: null 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      // Create user object compatible with existing interface
      const userData: User = {
        id: data.user.id.toString(),
        email: data.user.email,
        user_metadata: {
          display_name: data.user.first_name || data.user.last_name || data.user.username || displayName || email.split('@')[0]
        }
      };

      const sessionData: Session = {
        user: userData
      };

      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('session', JSON.stringify(sessionData));
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userRole', data.user.role);

      setUser(userData);
      setSession(sessionData);

      toast({
        title: "Success",
        description: "Account created successfully!",
      });

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setUsername("");
      setDisplayName("");

      // Navigate to home
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">iYKELib</CardTitle>
          <CardDescription>
            Access your digital library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">Display Name (Optional)</Label>
                  <Input
                    id="signup-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;