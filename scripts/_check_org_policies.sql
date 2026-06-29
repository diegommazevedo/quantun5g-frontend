SELECT policyname, tablename FROM pg_policies 
WHERE policyname IN ('nr01_assessments_select_org', 'diagnostics_select_org', 'companies_select_contratante')
ORDER BY tablename;
