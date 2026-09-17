import { apiClient, setAuthToken, removeAuthToken } from '@/lib/api';
import { UserProfile } from '@/types/review';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  department?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
      localStorage.setItem('contract_guard_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await apiClient<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access_token) {
      setAuthToken(response.access_token);
      localStorage.setItem('contract_guard_user', JSON.stringify(response.user));
    }
    return response;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const user = await apiClient<UserProfile>('/auth/me');
    localStorage.setItem('contract_guard_user', JSON.stringify(user));
    return user;
  },

  getStoredUser(): UserProfile | null {
    const stored = localStorage.getItem('contract_guard_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  logout(): void {
    removeAuthToken();
    localStorage.removeItem('contract_guard_user');
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('contract_guard_token'));
  },
};
