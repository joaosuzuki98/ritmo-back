INSERT INTO "incompletion_reasons" ("id", "description")
SELECT seed."id", seed."description"
FROM (
    VALUES
        ('a6c878de-7ca6-4c04-a6f3-5c1b0aafc501'::TEXT, 'Not enough time'::TEXT),
        ('a6c878de-7ca6-4c04-a6f3-5c1b0aafc502'::TEXT, 'I forgot'::TEXT),
        ('a6c878de-7ca6-4c04-a6f3-5c1b0aafc503'::TEXT, 'Lack of motivation'::TEXT),
        ('a6c878de-7ca6-4c04-a6f3-5c1b0aafc504'::TEXT, 'Unexpected event'::TEXT),
        ('a6c878de-7ca6-4c04-a6f3-5c1b0aafc505'::TEXT, 'Other'::TEXT)
) AS seed("id", "description")
WHERE NOT EXISTS (
    SELECT 1
    FROM "incompletion_reasons" AS existing
    WHERE lower(btrim(existing."description")) = lower(btrim(seed."description"))
)
ON CONFLICT ("id") DO NOTHING;
