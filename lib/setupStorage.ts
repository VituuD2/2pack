import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Supabase URL and Service Key are required. Make sure SUPABASE_SERVICE_KEY is set in your .env.local file.'
  );
} else {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const setupStorage = async () => {
    try {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) throw listError;
      
      const bucketExists = buckets.some((bucket) => bucket.name === 'avatars');

      if (!bucketExists) {
        console.log('Creating "avatars" bucket...');
        const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
          public: true,
        });
        if (createError) throw createError;
        console.log('"avatars" bucket created.');
      } else {
        console.log('"avatars" bucket already exists.');
      }
      
      console.log('Storage setup is complete. You can now upload avatars.');

    } catch (error: any) {
      console.error('Error during storage setup:', error.message);
    }
  };

  setupStorage();
}