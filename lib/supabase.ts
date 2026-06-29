import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xkpziepguaaaymbaxyzv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Z9L6XqfRswSz8O4oNQePEw_TPWQdmpy";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  username: string;
  zone_id: string;
  created_at: string;
};
