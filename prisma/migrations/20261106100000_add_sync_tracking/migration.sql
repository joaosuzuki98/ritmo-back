CREATE TABLE "sync_states" (
    "user_id" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "sync_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "sync_changes" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "changed_at" BIGINT NOT NULL,

    CONSTRAINT "sync_changes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sync_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sync_changes_user_id_changed_at_idx" ON "sync_changes"("user_id", "changed_at");
CREATE INDEX "sync_changes_user_id_table_name_record_id_changed_at_idx" ON "sync_changes"("user_id", "table_name", "record_id", "changed_at");
