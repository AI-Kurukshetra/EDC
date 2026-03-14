/**
 * Temporary database type placeholder. Regenerate this file from Supabase after the
 * migrations are applied:
 * `npx supabase gen types typescript --linked > types/database.types.ts`
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
