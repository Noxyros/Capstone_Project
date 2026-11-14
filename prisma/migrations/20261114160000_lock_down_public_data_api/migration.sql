DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'User',
        'PowerUp',
        'UserPowerUp',
        'DailyQuest',
        'UserQuestProgress',
        'DailyQuiz',
        'DailyQuizOption',
        'UserDailyQuizAttempt',
        'DailyChallenge',
        'DailyChallengeQuestion',
        'DailyChallengeOption',
        'DailyChallengeAnswer',
        'Grade',
        'Subject',
        'Chapter',
        'Submodule',
        'PracticeBankAttempt',
        'RoadmapNode',
        'Question',
        'Option',
        'UserProgress',
        'SubjectEnrollment',
        'NodeProgress',
        'RewardEvent',
        'QuizAttempt',
        'QuizAnswer',
        'ActivityDay',
        '_prisma_migrations'
    ]
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            'public',
            table_name
        );
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    END IF;
END $$;
