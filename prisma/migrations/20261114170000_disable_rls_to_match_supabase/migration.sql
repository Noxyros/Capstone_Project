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
            'ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY',
            'public',
            table_name
        );
    END LOOP;
END $$;
