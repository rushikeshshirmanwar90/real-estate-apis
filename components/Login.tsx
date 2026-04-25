"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
    confirmMail,
    sendOtp,
    addPassword,
    login,
    findUserType,
    forgetPassword,
    getUser,
    generateOTP,
    storeAuthData
} from "@/functions/login";

type Step = 'email' | 'otp' | 'password';

const Login: React.FC = () => {
    const router = useRouter();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOTP, setGeneratedOTP] = useState(0);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [userType, setUserType] = useState('');

    const handleGenerateOTP = async () => {
        if (!email.trim() || !email.includes('@')) {
            toast({
                title: "Error",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const check = await confirmMail(email);

            console.log(check);
            console.log(check.userType);
            
            if (!check.isUser) {
                toast({
                    title: "Error",
                    description: "User not found with this email address",
                    variant: "destructive",
                });
                return;
            }
            
            setUserType(check.userType);
            
            if (!check.verified) {
                // User exists but not verified - send OTP for password setup
                const OTP = generateOTP();
                setGeneratedOTP(OTP);
                const sendMail = await sendOtp(email, OTP);
                if (sendMail) {
                    toast({
                        title: "Success",
                        description: "OTP sent to your email",
                    });
                    setCurrentStep('otp');
                } else {
                    toast({
                        title: "Error",
                        description: "Something went wrong, can't send the OTP",
                        variant: "destructive",
                    });
                }
            } else {
                // User exists and is verified - go to password login
                setIsVerified(true);
                setCurrentStep('password');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "User not found",
                variant: "destructive",
            });
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.length !== 6) {
            toast({
                title: "Error",
                description: "Please enter a valid 6-digit OTP",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            if (Number(otp) === generatedOTP) {
                toast({
                    title: "Success",
                    description: "OTP verified successfully",
                });
                setCurrentStep('password');
            } else {
                toast({
                    title: "Error",
                    description: "Invalid OTP",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Invalid OTP",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async () => {
        if (!password.trim()) {
            toast({
                title: "Error",
                description: "Password is required",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 8) {
            toast({
                title: "Error",
                description: "Password must be at least 8 characters long",
                variant: "destructive",
            });
            return;
        }

        if (!/[A-Z]/.test(password)) {
            toast({
                title: "Error",
                description: "Password must contain at least one uppercase letter",
                variant: "destructive",
            });
            return;
        }

        if (!/[a-z]/.test(password)) {
            toast({
                title: "Error",
                description: "Password must contain at least one lowercase letter",
                variant: "destructive",
            });
            return;
        }

        if (!/\d/.test(password)) {
            toast({
                title: "Error",
                description: "Password must contain at least one number",
                variant: "destructive",
            });
            return;
        }

        if (!/[@$!%*?&]/.test(password)) {
            toast({
                title: "Error",
                description: "Password must contain at least one special character (@$!%*?&)",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            console.log('Setting password for user type:', userType);

            const res = await addPassword(email, password, userType);
            console.log('addPassword result:', res);
            
            if (res.success) {
                const user = await getUser(email, userType);
                console.log('User data retrieved:', user);

                if (user && user._id) {
                    // Convert ObjectId to string if needed
                    if (typeof user._id === 'object' && user._id !== null) {
                        user._id = String(user._id);
                    }
                    
                    if (user.clientId && typeof user.clientId === 'object' && user.clientId !== null) {
                        user.clientId = String(user.clientId);
                    }
                    
                    // ✅ FIX: For client users, if clientId doesn't exist, use their own _id
                    if (userType === 'clients' && !user.clientId) {
                        user.clientId = user._id;
                        console.log('✅ Set clientId to user._id for client user:', user.clientId);
                    }
                    
                    user.userType = userType;
                    
                    console.log('✅ User ID (_id):', user._id);
                    console.log('✅ Client ID (clientId):', user.clientId);
                    console.log('✅ User Type:', user.userType);
                }

                if (res.token && user) {
                    storeAuthData(res.token, user);
                }

                toast({
                    title: "Success",
                    description: "Password set successfully",
                });

                router.push("/");
                router.refresh();
            } else {
                console.error('❌ Password setup failed:', res.error);
                toast({
                    title: "Error",
                    description: res.error || "Failed to set password. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Password setup error:', error);
            toast({
                title: "Error",
                description: "Failed to set password",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!password.trim()) {
            toast({
                title: "Error",
                description: "Password is required",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 8) {
            toast({
                title: "Error",
                description: "Password must be at least 8 characters long",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const result = await login(email, password);
            console.log('Login result:', result);

            if (result.success) {
                const user = await getUser(email, userType);
                console.log('User data retrieved:', user);

                if (user && user._id) {
                    // Convert ObjectId to string if needed
                    if (typeof user._id === 'object' && user._id !== null) {
                        user._id = String(user._id);
                    }
                    
                    if (user.clientId && typeof user.clientId === 'object' && user.clientId !== null) {
                        user.clientId = String(user.clientId);
                    }
                    
                    // ✅ FIX: For client users, if clientId doesn't exist, use their own _id
                    if (userType === 'clients' && !user.clientId) {
                        user.clientId = user._id;
                        console.log('✅ Set clientId to user._id for client user:', user.clientId);
                    }
                    
                    user.userType = userType;
                    
                    console.log('✅ User ID (_id):', user._id);
                    console.log('✅ Client ID (clientId):', user.clientId);
                    console.log('✅ User Type:', user.userType);
                }

                if (result.token && user) {
                    storeAuthData(result.token, user);
                }

                toast({
                    title: "Success",
                    description: "User logged in successfully",
                });

                router.push("/");
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Invalid email or password",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            toast({
                title: "Error",
                description: "Failed to login due to an unexpected error",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgetPassword = async () => {
        setLoading(true);
        try {
            console.log('🔐 FORGET PASSWORD FLOW STARTED');
            console.log('Email:', email);

            const userTypeResult = await findUserType(email);

            console.log('User Type Result:', userTypeResult);

            if (!userTypeResult.success || !userTypeResult.userType) {
                console.log('❌ User not found');
                toast({
                    title: "Error",
                    description: "User not found with this email",
                    variant: "destructive",
                });
                return;
            }

            console.log('✅ User found with type:', userTypeResult.userType);
            setUserType(userTypeResult.userType);

            const result = await forgetPassword(email, userTypeResult.userType);

            console.log('Forget Password Result:', result);

            if (result.success) {
                console.log('✅ Password reset successful');
                toast({
                    title: "Success",
                    description: "Password reset successful. Please verify with OTP to set new password.",
                });
                
                const OTP = generateOTP();
                setGeneratedOTP(OTP);
                const sendMail = await sendOtp(email, OTP);
                
                if (sendMail) {
                    toast({
                        title: "Success",
                        description: "OTP sent to your email",
                    });
                    setIsVerified(false);
                    setCurrentStep('otp');
                    setPassword('');
                    setOtp('');
                } else {
                    toast({
                        title: "Error",
                        description: "Failed to send OTP. Please try again.",
                        variant: "destructive",
                    });
                }
            } else {
                console.log('❌ Failed to reset password');
                toast({
                    title: "Error",
                    description: result.error || "Failed to reset password",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('❌ Forget password error:', error);
            toast({
                title: "Error",
                description: "Failed to process forget password request",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'email':
                return (
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">Welcome Back</CardTitle>
                            <CardDescription>
                                Enter your email to continue
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleGenerateOTP}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Please wait
                                        </>
                                    ) : (
                                        'Next'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'otp':
                return (
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">Verification</CardTitle>
                            <CardDescription>
                                Please enter the 6-digit code sent to {email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="otp">OTP</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="otp"
                                            type="text"
                                            placeholder="6-digit OTP"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={6}
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleVerifyOTP}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying
                                        </>
                                    ) : (
                                        'Verify OTP'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setOtp('');
                                        setCurrentStep('email');
                                    }}
                                    className="w-full"
                                >
                                    Change Email
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 'password':
                return (
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                {isVerified ? 'Enter Password' : 'Set Password'}
                            </CardTitle>
                            <CardDescription>
                                {isVerified 
                                    ? `Enter your password for ${email}` 
                                    : 'Create a strong password: 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&)'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {isVerified && (
                                    <button
                                        onClick={handleForgetPassword}
                                        disabled={loading}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                )}

                                <Button
                                    onClick={!isVerified ? handleSetPassword : handleLogin}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Please wait
                                        </>
                                    ) : (
                                        isVerified ? 'Login' : 'Set Password'
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPassword('');
                                        setOtp('');
                                        setCurrentStep('email');
                                    }}
                                    className="w-full"
                                >
                                    Change Email
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
            {renderStep()}
        </div>
    );
}

export default Login;