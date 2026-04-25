export const getClientId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.warn('⚠️ No user data found in localStorage');
      return null;
    }

    const user = JSON.parse(userStr);
    console.log('📋 User data from localStorage:', user);

    let clientId = null;
    
    if (user.clientId) {
      clientId = typeof user.clientId === 'object' && user.clientId._id 
        ? user.clientId._id 
        : user.clientId;
      console.log('✅ ClientId found in user.clientId:', clientId);
    } 

    else if (user.userType === 'clients' || user.userType === 'client') {
      clientId = user._id;
      console.log('✅ Using user._id as clientId (client user):', clientId);
    }

    else {
      clientId = user._id;
      console.log('⚠️ Using user._id as fallback clientId:', clientId);
    }
    
    if (!clientId) {
      console.warn('⚠️ No clientId found in user data');
      console.warn('User object keys:', Object.keys(user));
      return null;
    }

    console.log('✅ Final ClientId retrieved:', clientId);
    return clientId;
  } catch (error) {
    console.error('❌ Error getting clientId:', error);
    return null;
  }
};

/**
 * Get the full user data from localStorage
 */
export const getUserData = (): any | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }

    return JSON.parse(userStr);
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return null;
  }
};

/**
 * Check if the current user is an admin
 */
export const isAdmin = (): boolean => {
  const user = getUserData();
  if (!user) return false;
  
  // Check if user has a role field (staff) or is a client/admin
  const userType = user.userType || localStorage.getItem('userType');
  return userType === 'clients' || userType === 'admin' || !user.role;
};
