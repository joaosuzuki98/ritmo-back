-- CreateTable
CREATE TABLE "auth_credentials" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idle_expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_codes" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_user_id_key" ON "auth_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_email_normalized_key" ON "auth_credentials"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_idle_expires_at_idx" ON "auth_sessions"("idle_expires_at");

-- CreateIndex
CREATE INDEX "password_reset_codes_user_id_expires_at_idx" ON "password_reset_codes"("user_id", "expires_at");

-- AddForeignKey
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
