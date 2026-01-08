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

  const setupStorageAndPolicies = async () => {
    try {
      // Create a helper function to execute raw SQL
      const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql;
      `;

      const { error: functionError } = await supabaseAdmin.rpc('eval', { code: createFunctionQuery });
      if (functionError) {
        // Fallback for older projects that might not have the 'eval' function
        if (functionError.message.includes('function eval(text) does not exist')) {
            await supabaseAdmin.rpc('sql', { query: createFunctionQuery });
        } else {
            throw functionError;
        }
      }

      console.log('Successfully created or replaced execute_sql function.');

      // Define policies
      const policies = [
        // Allow public read access
        `DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;`,
        `CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');`,
        
        // Allow authenticated users to upload
        `DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;`,
        `CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');`,

        // Allow users to update their own avatars
        `DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;`,
        `CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'avatars');`
      ];

      // Execute policies
      for (const policy of policies) {
        const { error: policyError } = await supabaseAdmin.rpc('execute_sql', { sql_query: policy });
        if (policyError) {
          console.error(`Error executing policy:`, policyError);
        } else {
          console.log(`Successfully executed policy.`);
        }
      }

      console.log('Storage policies are set up. You should now be able to upload avatars.');

    } catch (error: any) {
      console.error('Error during storage setup:', error.message);
    }
  };

  setupStorageAndPolicies();
}
