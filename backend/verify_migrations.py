import psycopg2

CONN_STR = "postgresql://postgres.peozqycguicekozognbb:mzQW79qIjOD5kC87@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

CHECKS = [
    (
        "1. Table count in schema public (Expected: 29)",
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    ),
    (
        "2. Tables with RLS disabled (Expected: 0 rows)",
        """SELECT c.relname AS bang_chua_bat_rls
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;"""
    ),
    (
        "3. Policies in public (Expected: 4 policies for authenticated)",
        """SELECT tablename, policyname, cmd, roles
           FROM pg_policies
           WHERE schemaname = 'public'
           ORDER BY tablename;"""
    ),
    (
        "4. Profile trigger on auth.users (Expected: on_auth_user_created)",
        """SELECT tgname
           FROM pg_trigger
           WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';"""
    ),
    (
        "5. Auth users missing profile in public.users (Expected: 0 rows)",
        """SELECT au.id, au.email
           FROM auth.users au
           LEFT JOIN public.users pu ON pu.id = au.id
           WHERE pu.id IS NULL;"""
    ),
    (
        "6. Values of enum user_role (Expected: student, admin, expert)",
        """SELECT e.enumlabel
           FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
           WHERE t.typname = 'user_role'
           ORDER BY e.enumsortorder;"""
    ),
    (
        "7. Transaction functions and execution privileges (anon/auth: False, service_role: True)",
        """SELECT p.proname,
                  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_priv,
                  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_priv,
                  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_priv
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('create_review_request', 'submit_attempt', 'save_answers', 'assign_pending_reviews')
           ORDER BY p.proname;"""
    ),
    (
        "8. Write privileges for authenticated on public.users (Expected: all False)",
        """SELECT has_table_privilege('authenticated', 'public.users', 'INSERT') AS insert_users,
                  has_table_privilege('authenticated', 'public.users', 'UPDATE') AS update_users,
                  has_table_privilege('anon', 'public.users', 'SELECT') AS anon_select_users;"""
    ),
    (
        "9. Tables enabled for Realtime publication (Expected: essays, test_attempts, review_requests)",
        """SELECT tablename
           FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
           ORDER BY tablename;"""
    ),
    (
        "10. Seed data counts (Expected: system_settings=6, band_conversions=34)",
        """SELECT (SELECT count(*) FROM public.system_settings) AS system_settings,
                  (SELECT count(*) FROM public.band_conversions) AS band_conversions;"""
    )
]

def main():
    conn = psycopg2.connect(CONN_STR)
    cur = conn.cursor()
    print("=== DATABASE MIGRATION VERIFICATION RESULTS ===")
    for title, sql in CHECKS:
        print(f"\n--- {title} ---")
        cur.execute(sql)
        cols = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
        print(f"Columns: {cols}")
        if not rows:
            print("  (No rows returned)")
        for row in rows:
            print(f"  {row}")
    cur.close()
    conn.close()
    print("\n=== VERIFICATION COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
