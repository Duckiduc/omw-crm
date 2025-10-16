import { createContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../lib/api";
import type { User } from "../lib/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: User }
  | { type: "AUTH_ERROR"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "CLEAR_ERROR" };

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        user: action.payload,
        error: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isLoading: false,
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      dispatch({ type: "AUTH_START" });
      apiClient.setToken(token);

      apiClient.getCurrentUser().then((response) => {
        if (response.data?.user) {
          dispatch({ type: "AUTH_SUCCESS", payload: response.data.user });
        } else {
          // Token is invalid, remove it
          localStorage.removeItem("token");
          apiClient.setToken(null);
          dispatch({ type: "AUTH_ERROR", payload: "Session expired" });
        }
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "AUTH_START" });

    const response = await apiClient.login(email, password);

    if (response.data) {
      apiClient.setToken(response.data.token);
      dispatch({ type: "AUTH_SUCCESS", payload: response.data.user });
      return true;
    } else {
      dispatch({
        type: "AUTH_ERROR",
        payload: response.error || "Login failed",
      });
      return false;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<boolean> => {
    dispatch({ type: "AUTH_START" });

    const response = await apiClient.register(userData);

    if (response.data) {
      apiClient.setToken(response.data.token);
      dispatch({ type: "AUTH_SUCCESS", payload: response.data.user });
      return true;
    } else {
      dispatch({
        type: "AUTH_ERROR",
        payload: response.error || "Registration failed",
      });
      return false;
    }
  };

  const logout = () => {
    apiClient.setToken(null);
    dispatch({ type: "AUTH_LOGOUT" });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
