import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

export default function Home() {
  const token = getAccessToken();
  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}