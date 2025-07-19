import { Request } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

export interface ApiRequest<T = any> extends Request {
  body: T;
  user: AuthenticatedUser;
  supabase: SupabaseClient;
  accessToken?: string;
}

