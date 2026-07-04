// src/lib/api.ts
// Client HTTP centralisé — ajoute automatiquement le token JWT à chaque requête
// et renouvelle automatiquement la session via le refresh token quand l'access
// token expire (toutes les 15 minutes), sans jamais déconnecter l'utilisateur
// pendant qu'il travaille.
import axios from 'axios';

// En dev : localhost. En production : VITE_API_URL (configurée sur Vercel).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Empêche plusieurs requêtes en 401 simultanées de déclencher chacune leur
// propre appel /auth/refresh — elles partagent la même promesse en cours.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    return accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Seulement pour une erreur 401 qu'on n'a pas déjà tenté de corriger,
    // et jamais pour l'appel de refresh lui-même (éviterait une boucle infinie)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      // Réutilise le refresh déjà en cours s'il y en a un
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        // Rejoue la requête d'origine avec le nouveau token, de façon transparente
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
      // Le refresh a échoué (refresh token aussi expiré) : là seulement on déconnecte
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);