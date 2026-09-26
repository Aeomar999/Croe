import axios from 'axios';

/**
 * Maps a failed login request to calm, human copy (UI-04: never show
 * backend codes, status numbers or stack traces to staff).
 */
export function loginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "We couldn't reach the Croe service. Check your connection and try again.";
    }
    const status = error.response.status;
    if (status === 400 || status === 401 || status === 403) {
      return "That email and password don't match our records. Please try again.";
    }
    if (status === 429) {
      return 'Too many sign-in attempts. Please wait a few minutes and try again.';
    }
  }
  return 'Sign-in is unavailable right now. Please try again shortly.';
}
