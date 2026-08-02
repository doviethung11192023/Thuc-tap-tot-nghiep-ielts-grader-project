import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const email = `test_${Date.now()}@example.com`;
  console.log('Registering', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
  });
  console.log('Error:', error);
  console.log('Data user id:', data?.user?.id);
  console.log('Data session:', data?.session);
  
  if (!error) {
    console.log('Testing reset password...');
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset-password',
    });
    console.log('Reset Password Res Error:', res.error);
    console.log('Reset Password Res Data:', res.data);
  }
}
test();
