import domain from "@/components/utils/domain";
import Cookies from 'js-cookie';

// Type definitions for API responses
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  token?: string;
  user?: any;
}

interface UserData {
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  [key: string]: any;
}

interface FindUserResponse {
  isUser: {
    userType: string;
  };
}

export const getUser = async (email: string, userType: string): Promise<UserData | null> => {
  try {
    console.log("🌐 Fetching user data...");
    console.log("   Email:", email);
    console.log("   UserType:", userType);

    // Use correct endpoint based on userType
    const endpoint =
      userType === "clients"
        ? `${domain}/api/clients?email=${email}`
        : `${domain}/api/${userType}?email=${email}`;

    console.log("   URL:", endpoint);

    const res = await fetch(endpoint);

    console.log("📦 API Response Status:", res.status);
    const data = await res.json();
    console.log("📦 API Response Data:", JSON.stringify(data, null, 2));

    if (res.status === 200) {
      const userData = data.data;
      console.log("✅ Extracted user data:", JSON.stringify(userData, null, 2));
      return userData || null;
    }
    return null;
  } catch (error) {
    console.error("❌ Failed to fetch user:", error);
    return null;
  }
};

export const confirmMail = async (email: string): Promise<{ verified: boolean; isUser: boolean; userType: string }> => {
  try {
    const res = await fetch(`${domain}/api/findUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.status === 200) {
      // User exists and is verified (has password)
      return { verified: true, isUser: true, userType: data.isUser.userType };
    } else if (res.status === 201) {
      // User exists but not verified (no password set)
      return { verified: false, isUser: true, userType: data.isUser.userType };
    } else {
      return { verified: false, isUser: false, userType: "" };
    }
  } catch (error: any) {
    console.error("❌ Failed to confirm mail:", error);
    
    if (error.response?.status === 404) {
      return { verified: false, isUser: false, userType: "" };
    }
    
    return { verified: false, isUser: false, userType: "" };
  }
};

export const sendOtp = async (email: string, OTP: number): Promise<boolean> => {
  try {
    console.log("📧 Sending OTP email...");
    console.log("   Email:", email);
    console.log("   OTP:", OTP);

    const res = await fetch(`${domain}/api/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, OTP }),
    });

    console.log("✅ OTP email sent successfully");
    console.log("   Status:", res.status);

    return res.status === 200;
  } catch (error: any) {
    console.error("❌ Failed to send OTP email:", error);
    return false;
  }
};

export const addPassword = async (
  email: string,
  password: string,
  userType: string
): Promise<{ success: boolean; message?: string; error?: string; token?: string; user?: any }> => {
  try {
    console.log('🔐 ADD PASSWORD API CALL');
    console.log('📧 Email:', email);
    console.log('👤 User Type:', userType);

    const res = await fetch(`${domain}/api/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, userType }),
    });

    const data = await res.json();

    console.log('✅ Password API Response Status:', res.status);
    console.log('✅ Password API Response Data:', data);

    if (res.status === 200) {
      return { 
        success: true, 
        message: data.message || 'Password set successfully',
        token: data.token,
        user: data.user
      };
    } else {
      return { success: false, error: data.message || 'Failed to set password' };
    }
  } catch (error: any) {
    console.error('❌ Add Password Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
};

export const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; token?: string; user?: any }> => {
  try {
    console.log('🌐 LOGIN API CALL:');
    console.log('  - Email:', email);
    console.log('  - URL:', `${domain}/api/login`);
    
    const res = await fetch(`${domain}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    console.log('📦 LOGIN API RESPONSE:');
    console.log('  - Status:', res.status);
    console.log('  - Data:', JSON.stringify(data, null, 2));

    if (res.status === 200) {
      const token = data.token || data.data?.token;
      const user = data.user || data.data?.user;
      
      console.log('✅ LOGIN SUCCESS:');
      console.log('  - Token found:', !!token);
      console.log('  - User found:', !!user);
      
      return { 
        success: true,
        token: token,
        user: user
      };
    } else {
      return {
        success: false,
        error: data.message || "Login failed",
      };
    }
  } catch (error: any) {
    console.error('❌ LOGIN ERROR:', error.message);
    return {
      success: false,
      error: error.message || "An error occurred",
    };
  }
};

export const findUserType = async (email: string): Promise<{ success: boolean; userType: string }> => {
  try {
    const res = await fetch(`${domain}/api/findUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.status === 200 || res.status === 201) {
      return { success: true, userType: data.isUser.userType };
    } else {
      return { success: false, userType: "" };
    }
  } catch (error: any) {
    console.error("Failed to find user type:", error);
    
    if (error.response?.status === 404) {
      return { success: false, userType: "" };
    }
    
    return { success: false, userType: "" };
  }
};

export const forgetPassword = async (email: string, userType: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const payload = { email, userType };

    console.log("FORGET PASSWORD API CALL");
    console.log("API Endpoint:", `${domain}/api/forget-password`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(`${domain}/api/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("Forget Password Response Status:", res.status);
    console.log("Forget Password Response Data:", JSON.stringify(data, null, 2));

    if (res.status === 200) {
      return {
        success: true,
        message: data.message || "Password reset email sent",
      };
    } else {
      return {
        success: false,
        error: data.message || "Failed to send reset email",
      };
    }
  } catch (error: any) {
    console.error("❌ FORGET PASSWORD ERROR:", error.message);
    return {
      success: false,
      error: error.message || "An error occurred",
    };
  }
};

// Helper function to generate OTP
export const generateOTP = (): number => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Helper function to store auth data
export const storeAuthData = (token: string, user: any) => {
  // Store token in cookie (7 days expiry)
  Cookies.set('client_auth_token', token, { expires: 7 });
  
  // Store user data in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userType', user.userType || 'clients');
    localStorage.setItem('loginTimestamp', Date.now().toString());
  }
};

// Helper function to clear auth data
export const clearAuthData = () => {
  Cookies.remove('client_auth_token');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('loginTimestamp');
  }
};