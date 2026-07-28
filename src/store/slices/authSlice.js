export const authInitialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export function createAuthState(user, token) {
  return {
    user,
    token,
    isAuthenticated: Boolean(user || token),
  };
}
