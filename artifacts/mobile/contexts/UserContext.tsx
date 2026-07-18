import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';

const USER_ID_KEY = '@health_companion_user_id';

interface UserContextValue {
  userId: string | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setOnboarded: (val: boolean) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  userId: null,
  isLoading: true,
  isOnboarded: false,
  setOnboarded: () => {},
  logout: async () => {},
});

function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 9);
  const random2 = Math.random().toString(36).substring(2, 9);
  return `dev_${timestamp}_${random1}_${random2}`;
}

const ONBOARDING_KEY = '@health_companion_onboarded';

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboardedState] = useState(false);

  useEffect(() => {
    // Set base URL for API calls from Expo
    const apiBase = process.env['EXPO_PUBLIC_API_BASE_URL'];
    const domain = process.env['EXPO_PUBLIC_DOMAIN'];
    if (apiBase) {
      setBaseUrl(apiBase);
    } else if (domain) {
      setBaseUrl(`https://${domain}`);
    }

    async function init() {
      try {
        // Get or create device ID
        let id = await AsyncStorage.getItem(USER_ID_KEY);
        if (!id) {
          id = generateDeviceId();
          await AsyncStorage.setItem(USER_ID_KEY, id);
        }
        setUserId(id);

        // Set auth token getter — backend reads this as user ID
        // Use AsyncStorage lookup at call time to avoid stale/empty closure values.
        setAuthTokenGetter(async () => {
          try {
            const current = await AsyncStorage.getItem(USER_ID_KEY);
            return current;
          } catch (err) {
            return id;
          }
        });

        // Check onboarding status
        const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        setIsOnboardedState(onboarded === 'true');
      } catch (err) {
        console.error('UserContext init error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const setOnboarded = useCallback(async (val: boolean) => {
    setIsOnboardedState(val);
    await AsyncStorage.setItem(ONBOARDING_KEY, val ? 'true' : 'false');
  }, []);

  const logout = useCallback(async () => {
    setIsOnboardedState(false);
    setUserId(null);
    setAuthTokenGetter(null);
    await AsyncStorage.multiRemove([USER_ID_KEY, ONBOARDING_KEY]);
  }, []);

  return (
    <UserContext.Provider value={{ userId, isLoading, isOnboarded, setOnboarded, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
