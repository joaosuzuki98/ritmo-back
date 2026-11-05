BEGIN;

-- Drop foreign keys before changing the referenced IDs from UUID to text.
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'f' AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', fk.schema_name, fk.table_name, fk.conname);
  END LOOP;
END $$;

-- Recreate only the non-unique indexes in the WatermelonDB schema below.
DROP INDEX "users_email_key";
DROP INDEX "habits_usuario_id_status_idx";
DROP INDEX "habits_usuario_id_horario_preferido_idx";
DROP INDEX "completion_records_data_idx";
DROP INDEX "completion_records_habito_id_data_key";
DROP INDEX "streaks_habito_id_key";

-- Rename existing columns to the WatermelonDB field names.
ALTER TABLE "users" RENAME COLUMN "nome" TO "name";
ALTER TABLE "users" RENAME COLUMN "pontos_totais" TO "total_points";
ALTER TABLE "users" RENAME COLUMN "nivel" TO "level";
ALTER TABLE "users" RENAME COLUMN "criado_em" TO "created_at";
ALTER TABLE "categories" RENAME COLUMN "nome" TO "name";
ALTER TABLE "categories" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "habits" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "habits" RENAME COLUMN "categoria_id" TO "category_id";
ALTER TABLE "habits" RENAME COLUMN "nome" TO "name";
ALTER TABLE "habits" RENAME COLUMN "descricao" TO "description";
ALTER TABLE "habits" RENAME COLUMN "frequencia_tipo" TO "frequency_type";
ALTER TABLE "habits" RENAME COLUMN "dias_semana" TO "week_days";
ALTER TABLE "habits" RENAME COLUMN "duracao_estimada_min" TO "estimated_duration_minutes";
ALTER TABLE "habits" RENAME COLUMN "horario_preferido" TO "preferred_time";
ALTER TABLE "habits" RENAME COLUMN "prioridade" TO "priority";
ALTER TABLE "habits" RENAME COLUMN "e_foco_do_dia" TO "is_focus_of_day";
ALTER TABLE "habits" RENAME COLUMN "sazonal_inicio" TO "seasonal_start";
ALTER TABLE "habits" RENAME COLUMN "sazonal_fim" TO "seasonal_end";
ALTER TABLE "habits" RENAME COLUMN "criado_em" TO "created_at";
ALTER TABLE "habit_dependencies" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "habit_dependencies" RENAME COLUMN "habito_gatilho_id" TO "trigger_habit_id";
ALTER TABLE "habit_dependencies" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "habit_conditions" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "habit_conditions" RENAME COLUMN "condicao_habito_id" TO "condition_habit_id";
ALTER TABLE "habit_conditions" RENAME COLUMN "condicao_regra" TO "condition_rule";
ALTER TABLE "habit_conditions" RENAME COLUMN "condicao_tipo" TO "condition_type";
ALTER TABLE "events" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "events" RENAME COLUMN "titulo" TO "title";
ALTER TABLE "events" RENAME COLUMN "data_hora" TO "date_time";
ALTER TABLE "events" RENAME COLUMN "local" TO "location";
ALTER TABLE "events" RENAME COLUMN "recorrencia" TO "recurrence";
ALTER TABLE "events" RENAME COLUMN "notificacao_min_antes" TO "notification_minutes_before";
ALTER TABLE "events" RENAME COLUMN "contador_regressivo" TO "countdown_enabled";
ALTER TABLE "events" RENAME COLUMN "origem_conversao" TO "conversion_origin";
ALTER TABLE "event_subtasks" RENAME COLUMN "evento_id" TO "event_id";
ALTER TABLE "event_subtasks" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "event_subtasks" RENAME COLUMN "data_vencimento" TO "due_date";
ALTER TABLE "incompletion_reasons" RENAME COLUMN "descricao" TO "description";
ALTER TABLE "completion_records" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "completion_records" RENAME COLUMN "data" TO "date";
ALTER TABLE "completion_records" RENAME COLUMN "horario_conclusao" TO "completion_time";
ALTER TABLE "completion_records" RENAME COLUMN "motivo_nao_conclusao_id" TO "incompletion_reason_id";
ALTER TABLE "completion_records" RENAME COLUMN "anotacao" TO "note";
ALTER TABLE "completion_records" RENAME COLUMN "bloqueio_distracao_ativado" TO "distraction_lock_enabled";
ALTER TABLE "streaks" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "streaks" RENAME COLUMN "sequencia_atual" TO "current_streak";
ALTER TABLE "streaks" RENAME COLUMN "maior_sequencia" TO "longest_streak";
ALTER TABLE "streaks" RENAME COLUMN "atualizado_em" TO "updated_at";
ALTER TABLE "daily_notes" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "daily_notes" RENAME COLUMN "data" TO "date";
ALTER TABLE "daily_notes" RENAME COLUMN "texto" TO "text";
ALTER TABLE "goals" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "goals" RENAME COLUMN "prazo" TO "deadline_type";
ALTER TABLE "goals" RENAME COLUMN "descricao" TO "description";
ALTER TABLE "goals" RENAME COLUMN "valor_alvo" TO "target_value";
ALTER TABLE "goals" RENAME COLUMN "valor_atual" TO "current_value";
ALTER TABLE "group_consistency_goals" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "group_consistency_goals" RENAME COLUMN "percentual_alvo" TO "target_percentage";
ALTER TABLE "group_consistency_goals" RENAME COLUMN "habitos_incluidos" TO "included_habit_ids";
ALTER TABLE "group_consistency_goals" RENAME COLUMN "periodo_inicio" TO "period_start";
ALTER TABLE "group_consistency_goals" RENAME COLUMN "periodo_fim" TO "period_end";
ALTER TABLE "temporary_challenges" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "temporary_challenges" RENAME COLUMN "duracao_dias" TO "duration_days";
ALTER TABLE "temporary_challenges" RENAME COLUMN "data_inicio" TO "start_date";
ALTER TABLE "rewards" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "rewards" RENAME COLUMN "meta_id" TO "goal_id";
ALTER TABLE "rewards" RENAME COLUMN "descricao" TO "description";
ALTER TABLE "rewards" RENAME COLUMN "resgatada" TO "redeemed";
ALTER TABLE "rewards" RENAME COLUMN "resgatada_em" TO "redeemed_at";
ALTER TABLE "reminders" RENAME COLUMN "habito_id" TO "habit_id";
ALTER TABLE "reminders" RENAME COLUMN "evento_id" TO "event_id";
ALTER TABLE "reminders" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "reminders" RENAME COLUMN "horario_calculado" TO "calculated_time";
ALTER TABLE "reminders" RENAME COLUMN "geofence_raio_m" TO "geofence_radius_m";
ALTER TABLE "reminders" RENAME COLUMN "enviado_em" TO "sent_at";
ALTER TABLE "routine_templates" RENAME COLUMN "usuario_id" TO "user_id";
ALTER TABLE "routine_templates" RENAME COLUMN "nome" TO "name";
ALTER TABLE "routine_templates" RENAME COLUMN "habitos_incluidos" TO "included_habit_ids";
ALTER TABLE "routine_templates" RENAME COLUMN "eventos_incluidos" TO "included_events";

-- Change WatermelonDB date fields to Unix milliseconds.
ALTER TABLE "users" ALTER COLUMN "created_at" DROP DEFAULT;
ALTER TABLE "habits" ALTER COLUMN "created_at" DROP DEFAULT;
ALTER TABLE "streaks" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "users" ALTER COLUMN "created_at" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "created_at") * 1000)::bigint);
ALTER TABLE "habits" ALTER COLUMN "created_at" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "created_at") * 1000)::bigint);
ALTER TABLE "habits" ALTER COLUMN "preferred_time" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "preferred_time") * 1000)::bigint);
ALTER TABLE "habits" ALTER COLUMN "seasonal_start" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "seasonal_start") * 1000)::bigint);
ALTER TABLE "habits" ALTER COLUMN "seasonal_end" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "seasonal_end") * 1000)::bigint);
ALTER TABLE "events" ALTER COLUMN "date_time" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "date_time") * 1000)::bigint);
ALTER TABLE "event_subtasks" ALTER COLUMN "due_date" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "due_date") * 1000)::bigint);
ALTER TABLE "completion_records" ALTER COLUMN "date" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "date"::timestamp) * 1000)::bigint);
ALTER TABLE "completion_records" ALTER COLUMN "completion_time" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "completion_time") * 1000)::bigint);
ALTER TABLE "streaks" ALTER COLUMN "updated_at" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "updated_at") * 1000)::bigint);
ALTER TABLE "daily_notes" ALTER COLUMN "date" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "date"::timestamp) * 1000)::bigint);
ALTER TABLE "group_consistency_goals" ALTER COLUMN "period_start" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "period_start"::timestamp) * 1000)::bigint);
ALTER TABLE "group_consistency_goals" ALTER COLUMN "period_end" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "period_end"::timestamp) * 1000)::bigint);
ALTER TABLE "temporary_challenges" ALTER COLUMN "start_date" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "start_date"::timestamp) * 1000)::bigint);
ALTER TABLE "rewards" ALTER COLUMN "redeemed_at" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "redeemed_at") * 1000)::bigint);
ALTER TABLE "reminders" ALTER COLUMN "calculated_time" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "calculated_time") * 1000)::bigint);
ALTER TABLE "reminders" ALTER COLUMN "sent_at" TYPE BIGINT USING ((EXTRACT(EPOCH FROM "sent_at") * 1000)::bigint);
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "habits" ALTER COLUMN "created_at" SET DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "streaks" ALTER COLUMN "updated_at" SET DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;

-- Store WatermelonDB JSON columns in their local string representation.
ALTER TABLE "habits" ALTER COLUMN "week_days" DROP DEFAULT;
ALTER TABLE "habits" ALTER COLUMN "week_days" TYPE TEXT USING COALESCE(to_json("week_days")::text, '[]');
UPDATE "habits" SET "week_days" = '[]' WHERE "week_days" IS NULL;
ALTER TABLE "habits" ALTER COLUMN "week_days" SET DEFAULT '[]';
ALTER TABLE "habits" ALTER COLUMN "week_days" SET NOT NULL;
ALTER TABLE "habit_conditions" ALTER COLUMN "condition_rule" TYPE TEXT USING "condition_rule"::text;
ALTER TABLE "group_consistency_goals" ALTER COLUMN "included_habit_ids" TYPE TEXT USING "included_habit_ids"::text;
ALTER TABLE "routine_templates" ALTER COLUMN "included_habit_ids" TYPE TEXT USING "included_habit_ids"::text;
ALTER TABLE "routine_templates" ALTER COLUMN "included_events" TYPE TEXT USING "included_events"::text;

-- Use flexible strings for values represented as strings in the frontend.
ALTER TABLE "habits" ALTER COLUMN "frequency_type" TYPE TEXT USING "frequency_type"::text;
ALTER TABLE "habits" ALTER COLUMN "priority" TYPE TEXT USING "priority"::text;
ALTER TABLE "habits" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "habit_dependencies" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "habit_conditions" ALTER COLUMN "condition_type" TYPE TEXT USING "condition_type"::text;
ALTER TABLE "events" ALTER COLUMN "recurrence" TYPE TEXT USING "recurrence"::text;
ALTER TABLE "events" ALTER COLUMN "conversion_origin" TYPE TEXT USING "conversion_origin"::text;
ALTER TABLE "completion_records" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "goals" ALTER COLUMN "deadline_type" TYPE TEXT USING "deadline_type"::text;
ALTER TABLE "goals" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "temporary_challenges" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "reminders" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- Match JavaScript/WatermelonDB numeric fields without narrowing values.
ALTER TABLE "users" ALTER COLUMN "total_points" TYPE DOUBLE PRECISION USING "total_points"::double precision;
ALTER TABLE "users" ALTER COLUMN "level" TYPE DOUBLE PRECISION USING "level"::double precision;
ALTER TABLE "habits" ALTER COLUMN "estimated_duration_minutes" TYPE DOUBLE PRECISION USING "estimated_duration_minutes"::double precision;
ALTER TABLE "events" ALTER COLUMN "notification_minutes_before" TYPE DOUBLE PRECISION USING "notification_minutes_before"::double precision;
ALTER TABLE "streaks" ALTER COLUMN "current_streak" TYPE DOUBLE PRECISION USING "current_streak"::double precision;
ALTER TABLE "streaks" ALTER COLUMN "longest_streak" TYPE DOUBLE PRECISION USING "longest_streak"::double precision;
ALTER TABLE "goals" ALTER COLUMN "target_value" TYPE DOUBLE PRECISION USING "target_value"::double precision;
ALTER TABLE "goals" ALTER COLUMN "current_value" TYPE DOUBLE PRECISION USING "current_value"::double precision;
ALTER TABLE "group_consistency_goals" ALTER COLUMN "target_percentage" TYPE DOUBLE PRECISION USING "target_percentage"::double precision;
ALTER TABLE "temporary_challenges" ALTER COLUMN "duration_days" TYPE DOUBLE PRECISION USING "duration_days"::double precision;

-- Preserve client IDs and all references as text, rather than imposing UUID format.
ALTER TABLE "users" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "categories" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "habits" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "habit_dependencies" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "habit_conditions" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "events" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "event_subtasks" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "incompletion_reasons" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "completion_records" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "streaks" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "daily_notes" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "goals" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "group_consistency_goals" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "temporary_challenges" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "rewards" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "reminders" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "routine_templates" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "categories" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "habits" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "habits" ALTER COLUMN "category_id" TYPE TEXT USING "category_id"::text;
ALTER TABLE "habit_dependencies" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "habit_dependencies" ALTER COLUMN "trigger_habit_id" TYPE TEXT USING "trigger_habit_id"::text;
ALTER TABLE "habit_conditions" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "habit_conditions" ALTER COLUMN "condition_habit_id" TYPE TEXT USING "condition_habit_id"::text;
ALTER TABLE "events" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "event_subtasks" ALTER COLUMN "event_id" TYPE TEXT USING "event_id"::text;
ALTER TABLE "event_subtasks" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "completion_records" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "completion_records" ALTER COLUMN "incompletion_reason_id" TYPE TEXT USING "incompletion_reason_id"::text;
ALTER TABLE "streaks" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "daily_notes" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "goals" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "group_consistency_goals" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "temporary_challenges" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "rewards" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "rewards" ALTER COLUMN "goal_id" TYPE TEXT USING "goal_id"::text;
ALTER TABLE "reminders" ALTER COLUMN "habit_id" TYPE TEXT USING "habit_id"::text;
ALTER TABLE "reminders" ALTER COLUMN "event_id" TYPE TEXT USING "event_id"::text;
ALTER TABLE "routine_templates" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
ALTER TABLE "scores" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "groups" ALTER COLUMN "criado_por" TYPE TEXT USING "criado_por"::text;
ALTER TABLE "group_members" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "group_habits" ALTER COLUMN "habito_id" TYPE TEXT USING "habito_id"::text;
ALTER TABLE "scheduling_preferences" ALTER COLUMN "habito_id" TYPE TEXT USING "habito_id"::text;
ALTER TABLE "category_suggestions" ALTER COLUMN "habito_id" TYPE TEXT USING "habito_id"::text;
ALTER TABLE "category_suggestions" ALTER COLUMN "categoria_sugerida_id" TYPE TEXT USING "categoria_sugerida_id"::text;
ALTER TABLE "habit_correlations" ALTER COLUMN "habito_a_id" TYPE TEXT USING "habito_a_id"::text;
ALTER TABLE "habit_correlations" ALTER COLUMN "habito_b_id" TYPE TEXT USING "habito_b_id"::text;
ALTER TABLE "habit_impacts" ALTER COLUMN "habito_id" TYPE TEXT USING "habito_id"::text;
ALTER TABLE "productivity_scores" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "edit_history" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "edit_history" ALTER COLUMN "entidade_id" TYPE TEXT USING "entidade_id"::text;
ALTER TABLE "imported_health_data" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "imported_health_data" ALTER COLUMN "habito_id" TYPE TEXT USING "habito_id"::text;
ALTER TABLE "backups" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;
ALTER TABLE "exports" ALTER COLUMN "usuario_id" TYPE TEXT USING "usuario_id"::text;

-- Add columns present in the sync contract; existing rows receive millisecond timestamps.
ALTER TABLE "users" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "categories" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "categories" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "habits" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "users" ADD COLUMN "mascot_name" TEXT;
ALTER TABLE "habit_dependencies" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "habit_dependencies" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "habit_conditions" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "habit_conditions" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "events" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "events" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "event_subtasks" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "event_subtasks" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "incompletion_reasons" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "incompletion_reasons" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "completion_records" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "completion_records" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "daily_notes" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "daily_notes" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "goals" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "goals" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "group_consistency_goals" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "group_consistency_goals" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "temporary_challenges" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "temporary_challenges" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "rewards" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "rewards" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "reminders" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "reminders" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "routine_templates" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "routine_templates" ADD COLUMN "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint;
ALTER TABLE "events" ADD COLUMN "end_time" BIGINT;
ALTER TABLE "events" ADD COLUMN "description" TEXT;
ALTER TABLE "events" ADD COLUMN "reminder_type" TEXT;
ALTER TABLE "group_consistency_goals" ADD COLUMN "description" TEXT;

-- Create tables added by the frontend schema.
CREATE TABLE "habit_display_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_day" DOUBLE PRECISION NOT NULL,
    "ordered_habit_ids" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,

    CONSTRAINT "habit_display_preferences_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "todo_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_complete" BOOLEAN NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,

    CONSTRAINT "todo_tasks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "todo_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,
    "updated_at" BIGINT NOT NULL DEFAULT ((EXTRACT(epoch FROM CURRENT_TIMESTAMP) * (1000)::numeric))::bigint,

    CONSTRAINT "todo_categories_pkey" PRIMARY KEY ("id")
);

-- Remove enum types no longer used by the sync tables.
DROP TYPE "FrequencyType";
DROP TYPE "HabitPriority";
DROP TYPE "HabitStatus";
DROP TYPE "HabitDependencyType";
DROP TYPE "ConditionRuleType";
DROP TYPE "EventSource";
DROP TYPE "EventRecurrence";
DROP TYPE "CompletionStatus";
DROP TYPE "GoalDeadlineType";
DROP TYPE "GoalStatus";
DROP TYPE "ChallengeStatus";
DROP TYPE "ReminderType";

-- Add indexes from the frontend schema.
CREATE INDEX "habit_display_preferences_user_id_idx" ON "habit_display_preferences"("user_id");
CREATE INDEX "habit_display_preferences_week_day_idx" ON "habit_display_preferences"("week_day");
CREATE INDEX "todo_tasks_user_id_idx" ON "todo_tasks"("user_id");
CREATE INDEX "todo_tasks_category_idx" ON "todo_tasks"("category");
CREATE INDEX "todo_categories_user_id_idx" ON "todo_categories"("user_id");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");
CREATE INDEX "habits_user_id_status_idx" ON "habits"("user_id", "status");
CREATE INDEX "habits_user_id_preferred_time_idx" ON "habits"("user_id", "preferred_time");
CREATE INDEX "habits_category_id_idx" ON "habits"("category_id");
CREATE INDEX "habit_dependencies_habit_id_idx" ON "habit_dependencies"("habit_id");
CREATE INDEX "habit_dependencies_trigger_habit_id_idx" ON "habit_dependencies"("trigger_habit_id");
CREATE INDEX "habit_conditions_habit_id_idx" ON "habit_conditions"("habit_id");
CREATE INDEX "habit_conditions_condition_habit_id_idx" ON "habit_conditions"("condition_habit_id");
CREATE INDEX "events_user_id_idx" ON "events"("user_id");
CREATE INDEX "event_subtasks_event_id_idx" ON "event_subtasks"("event_id");
CREATE INDEX "event_subtasks_habit_id_idx" ON "event_subtasks"("habit_id");
CREATE INDEX "completion_records_habit_id_idx" ON "completion_records"("habit_id");
CREATE INDEX "completion_records_date_idx" ON "completion_records"("date");
CREATE INDEX "streaks_habit_id_idx" ON "streaks"("habit_id");
CREATE INDEX "daily_notes_user_id_idx" ON "daily_notes"("user_id");
CREATE INDEX "daily_notes_date_idx" ON "daily_notes"("date");
CREATE INDEX "goals_habit_id_idx" ON "goals"("habit_id");
CREATE INDEX "group_consistency_goals_user_id_idx" ON "group_consistency_goals"("user_id");
CREATE INDEX "temporary_challenges_habit_id_idx" ON "temporary_challenges"("habit_id");
CREATE INDEX "rewards_user_id_idx" ON "rewards"("user_id");
CREATE INDEX "rewards_goal_id_idx" ON "rewards"("goal_id");
CREATE INDEX "reminders_habit_id_idx" ON "reminders"("habit_id");
CREATE INDEX "reminders_event_id_idx" ON "reminders"("event_id");
CREATE INDEX "routine_templates_user_id_idx" ON "routine_templates"("user_id");

-- Restore foreign keys after converting referenced IDs to text.
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "habit_dependencies" ADD CONSTRAINT "habit_dependencies_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_dependencies" ADD CONSTRAINT "habit_dependencies_trigger_habit_id_fkey" FOREIGN KEY ("trigger_habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_conditions" ADD CONSTRAINT "habit_conditions_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_conditions" ADD CONSTRAINT "habit_conditions_condition_habit_id_fkey" FOREIGN KEY ("condition_habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_subtasks" ADD CONSTRAINT "event_subtasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_subtasks" ADD CONSTRAINT "event_subtasks_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "completion_records" ADD CONSTRAINT "completion_records_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "completion_records" ADD CONSTRAINT "completion_records_incompletion_reason_id_fkey" FOREIGN KEY ("incompletion_reason_id") REFERENCES "incompletion_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goals" ADD CONSTRAINT "goals_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_consistency_goals" ADD CONSTRAINT "group_consistency_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "temporary_challenges" ADD CONSTRAINT "temporary_challenges_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routine_templates" ADD CONSTRAINT "routine_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_display_preferences" ADD CONSTRAINT "habit_display_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "todo_tasks" ADD CONSTRAINT "todo_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "todo_categories" ADD CONSTRAINT "todo_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_habits" ADD CONSTRAINT "group_habits_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_habits" ADD CONSTRAINT "group_habits_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduling_preferences" ADD CONSTRAINT "scheduling_preferences_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_categoria_sugerida_id_fkey" FOREIGN KEY ("categoria_sugerida_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_correlations" ADD CONSTRAINT "habit_correlations_habito_a_id_fkey" FOREIGN KEY ("habito_a_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_correlations" ADD CONSTRAINT "habit_correlations_habito_b_id_fkey" FOREIGN KEY ("habito_b_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "habit_impacts" ADD CONSTRAINT "habit_impacts_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "imported_health_data" ADD CONSTRAINT "imported_health_data_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "imported_health_data" ADD CONSTRAINT "imported_health_data_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backups" ADD CONSTRAINT "backups_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exports" ADD CONSTRAINT "exports_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
