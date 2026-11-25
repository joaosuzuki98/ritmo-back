CREATE TABLE "ai_proposals" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_proposals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_proposals_status_check" CHECK ("status" IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX "ai_proposals_user_id_status_idx" ON "ai_proposals"("user_id", "status");
CREATE INDEX "ai_proposals_expires_at_idx" ON "ai_proposals"("expires_at");
