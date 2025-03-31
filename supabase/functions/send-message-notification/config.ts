
import { defineConfig } from "npm:@supabase/functions-js@2.1.1";

export default defineConfig({
  external: [
    "https://deno.land/std@0.190.0/http/server.ts",
  ],
});
