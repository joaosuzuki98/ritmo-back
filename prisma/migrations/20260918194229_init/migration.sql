/*
  Warnings:

  - You are about to drop the `anotacoes_diarias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `correlacoes_habitos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dados_saude_importados` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `desafios_temporarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `evento_subtarefas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eventos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exportacoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grupo_membros` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grupos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `habito_condicoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `habito_dependencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `habitos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `habitos_grupo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `historico_edicoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `impacto_habitos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lembretes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `metas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `metas_consistencia_grupo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `motivos_nao_conclusao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pontuacoes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pontuacoes_produtividade` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `preferencias_agendamento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recompensas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `registros_conclusao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sequencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sugestoes_categoria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `templates_rotina` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "HabitPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HabitStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HabitDependencyType" AS ENUM ('BLOCKING', 'REMINDER_ONLY');

-- CreateEnum
CREATE TYPE "ConditionRuleType" AS ENUM ('ALL', 'ANY');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'GENERATED_FROM_TASK');

-- CreateEnum
CREATE TYPE "EventRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "GoalDeadlineType" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('ADAPTIVE', 'PREPARATION', 'LOCATION', 'SEQUENCE', 'RECOVERY');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'JSON', 'PDF');

-- CreateEnum
CREATE TYPE "HistoryEntity" AS ENUM ('HABIT', 'EVENT');

-- DropForeignKey
ALTER TABLE "anotacoes_diarias" DROP CONSTRAINT "anotacoes_diarias_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "backups" DROP CONSTRAINT "backups_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "categorias" DROP CONSTRAINT "categorias_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "correlacoes_habitos" DROP CONSTRAINT "correlacoes_habitos_habito_a_id_fkey";

-- DropForeignKey
ALTER TABLE "correlacoes_habitos" DROP CONSTRAINT "correlacoes_habitos_habito_b_id_fkey";

-- DropForeignKey
ALTER TABLE "dados_saude_importados" DROP CONSTRAINT "dados_saude_importados_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "dados_saude_importados" DROP CONSTRAINT "dados_saude_importados_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "desafios_temporarios" DROP CONSTRAINT "desafios_temporarios_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "evento_subtarefas" DROP CONSTRAINT "evento_subtarefas_evento_id_fkey";

-- DropForeignKey
ALTER TABLE "evento_subtarefas" DROP CONSTRAINT "evento_subtarefas_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "eventos" DROP CONSTRAINT "eventos_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "exportacoes" DROP CONSTRAINT "exportacoes_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "grupo_membros" DROP CONSTRAINT "grupo_membros_grupo_id_fkey";

-- DropForeignKey
ALTER TABLE "grupo_membros" DROP CONSTRAINT "grupo_membros_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "grupos" DROP CONSTRAINT "grupos_criado_por_fkey";

-- DropForeignKey
ALTER TABLE "habito_condicoes" DROP CONSTRAINT "habito_condicoes_condicao_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "habito_condicoes" DROP CONSTRAINT "habito_condicoes_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "habito_dependencias" DROP CONSTRAINT "habito_dependencias_habito_gatilho_id_fkey";

-- DropForeignKey
ALTER TABLE "habito_dependencias" DROP CONSTRAINT "habito_dependencias_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "habitos" DROP CONSTRAINT "habitos_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "habitos" DROP CONSTRAINT "habitos_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "habitos_grupo" DROP CONSTRAINT "habitos_grupo_grupo_id_fkey";

-- DropForeignKey
ALTER TABLE "impacto_habitos" DROP CONSTRAINT "impacto_habitos_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "lembretes" DROP CONSTRAINT "lembretes_evento_id_fkey";

-- DropForeignKey
ALTER TABLE "lembretes" DROP CONSTRAINT "lembretes_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "metas" DROP CONSTRAINT "metas_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "metas_consistencia_grupo" DROP CONSTRAINT "metas_consistencia_grupo_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "pontuacoes" DROP CONSTRAINT "pontuacoes_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "recompensas" DROP CONSTRAINT "recompensas_meta_id_fkey";

-- DropForeignKey
ALTER TABLE "recompensas" DROP CONSTRAINT "recompensas_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "registros_conclusao" DROP CONSTRAINT "registros_conclusao_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "registros_conclusao" DROP CONSTRAINT "registros_conclusao_motivo_nao_conclusao_id_fkey";

-- DropForeignKey
ALTER TABLE "sequencias" DROP CONSTRAINT "sequencias_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "sugestoes_categoria" DROP CONSTRAINT "sugestoes_categoria_categoria_sugerida_id_fkey";

-- DropForeignKey
ALTER TABLE "sugestoes_categoria" DROP CONSTRAINT "sugestoes_categoria_habito_id_fkey";

-- DropForeignKey
ALTER TABLE "templates_rotina" DROP CONSTRAINT "templates_rotina_usuario_id_fkey";

-- DropTable
DROP TABLE "anotacoes_diarias";

-- DropTable
DROP TABLE "categorias";

-- DropTable
DROP TABLE "correlacoes_habitos";

-- DropTable
DROP TABLE "dados_saude_importados";

-- DropTable
DROP TABLE "desafios_temporarios";

-- DropTable
DROP TABLE "evento_subtarefas";

-- DropTable
DROP TABLE "eventos";

-- DropTable
DROP TABLE "exportacoes";

-- DropTable
DROP TABLE "grupo_membros";

-- DropTable
DROP TABLE "grupos";

-- DropTable
DROP TABLE "habito_condicoes";

-- DropTable
DROP TABLE "habito_dependencias";

-- DropTable
DROP TABLE "habitos";

-- DropTable
DROP TABLE "habitos_grupo";

-- DropTable
DROP TABLE "historico_edicoes";

-- DropTable
DROP TABLE "impacto_habitos";

-- DropTable
DROP TABLE "lembretes";

-- DropTable
DROP TABLE "metas";

-- DropTable
DROP TABLE "metas_consistencia_grupo";

-- DropTable
DROP TABLE "motivos_nao_conclusao";

-- DropTable
DROP TABLE "pontuacoes";

-- DropTable
DROP TABLE "pontuacoes_produtividade";

-- DropTable
DROP TABLE "preferencias_agendamento";

-- DropTable
DROP TABLE "recompensas";

-- DropTable
DROP TABLE "registros_conclusao";

-- DropTable
DROP TABLE "sequencias";

-- DropTable
DROP TABLE "sugestoes_categoria";

-- DropTable
DROP TABLE "templates_rotina";

-- DropTable
DROP TABLE "usuarios";

-- DropEnum
DROP TYPE "EntidadeHistorico";

-- DropEnum
DROP TYPE "FrequenciaTipo";

-- DropEnum
DROP TYPE "OrigemEvento";

-- DropEnum
DROP TYPE "PrioridadeHabito";

-- DropEnum
DROP TYPE "RecorrenciaEvento";

-- DropEnum
DROP TYPE "StatusConclusao";

-- DropEnum
DROP TYPE "StatusDesafio";

-- DropEnum
DROP TYPE "StatusHabito";

-- DropEnum
DROP TYPE "StatusMeta";

-- DropEnum
DROP TYPE "TipoDependenciaHabito";

-- DropEnum
DROP TYPE "TipoFormatoExportacao";

-- DropEnum
DROP TYPE "TipoLembrete";

-- DropEnum
DROP TYPE "TipoPrazoMeta";

-- DropEnum
DROP TYPE "TipoRegraCondicao";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pontos_totais" INTEGER NOT NULL DEFAULT 0,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "categoria_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "frequencia_tipo" "FrequencyType" NOT NULL,
    "dias_semana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "duracao_estimada_min" INTEGER,
    "horario_preferido" TIMESTAMP(3),
    "prioridade" "HabitPriority" NOT NULL,
    "e_foco_do_dia" BOOLEAN NOT NULL DEFAULT false,
    "status" "HabitStatus" NOT NULL,
    "sazonal_inicio" TIMESTAMP(3),
    "sazonal_fim" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_dependencies" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "habito_gatilho_id" UUID NOT NULL,
    "tipo" "HabitDependencyType" NOT NULL,

    CONSTRAINT "habit_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_conditions" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "condicao_habito_id" UUID NOT NULL,
    "condicao_regra" JSONB NOT NULL,
    "condicao_tipo" "ConditionRuleType",

    CONSTRAINT "habit_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "recorrencia" "EventRecurrence" NOT NULL,
    "notificacao_min_antes" INTEGER,
    "contador_regressivo" BOOLEAN NOT NULL DEFAULT false,
    "origem_conversao" "EventSource" NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_subtasks" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "data_vencimento" TIMESTAMP(3),

    CONSTRAINT "event_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incompletion_reasons" (
    "id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "incompletion_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completion_records" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "status" "CompletionStatus" NOT NULL,
    "horario_conclusao" TIMESTAMP(3),
    "motivo_nao_conclusao_id" UUID,
    "anotacao" TEXT,
    "bloqueio_distracao_ativado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "completion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaks" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "sequencia_atual" INTEGER NOT NULL DEFAULT 0,
    "maior_sequencia" INTEGER NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_notes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "daily_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "prazo" "GoalDeadlineType" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor_alvo" INTEGER NOT NULL,
    "valor_atual" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_consistency_goals" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "percentual_alvo" INTEGER NOT NULL,
    "habitos_incluidos" JSONB NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fim" DATE NOT NULL,

    CONSTRAINT "group_consistency_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_challenges" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "duracao_dias" INTEGER NOT NULL,
    "data_inicio" DATE NOT NULL,
    "status" "ChallengeStatus" NOT NULL,

    CONSTRAINT "temporary_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "meta_id" UUID,
    "descricao" TEXT NOT NULL,
    "resgatada" BOOLEAN NOT NULL DEFAULT false,
    "resgatada_em" TIMESTAMP(3),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "origem" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_por" UUID NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "grupo_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "entrou_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("grupo_id","usuario_id")
);

-- CreateTable
CREATE TABLE "group_habits" (
    "id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "group_habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "habito_id" UUID,
    "evento_id" UUID,
    "tipo" "ReminderType" NOT NULL,
    "horario_calculado" TIMESTAMP(3),
    "geofence_lat" DOUBLE PRECISION,
    "geofence_lng" DOUBLE PRECISION,
    "geofence_raio_m" DOUBLE PRECISION,
    "enviado_em" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduling_preferences" (
    "id" UUID NOT NULL,
    "habito_id" UUID NOT NULL,
    "horario_sugerido" TIMESTAMP(3),
    "motivo" TEXT,

    CONSTRAINT "scheduling_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_suggestions" (
    "habito_id" UUID NOT NULL,
    "categoria_sugerida_id" UUID NOT NULL,
    "confianca" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("habito_id")
);

-- CreateTable
CREATE TABLE "habit_correlations" (
    "id" UUID NOT NULL,
    "habito_a_id" UUID NOT NULL,
    "habito_b_id" UUID NOT NULL,
    "coeficiente" DOUBLE PRECISION NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_correlations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_impacts" (
    "habito_id" UUID NOT NULL,
    "indice_impacto" DOUBLE PRECISION NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_impacts_pkey" PRIMARY KEY ("habito_id")
);

-- CreateTable
CREATE TABLE "productivity_scores" (
    "usuario_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "productivity_scores_pkey" PRIMARY KEY ("usuario_id","data")
);

-- CreateTable
CREATE TABLE "routine_templates" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "habitos_incluidos" JSONB NOT NULL,
    "eventos_incluidos" JSONB NOT NULL,

    CONSTRAINT "routine_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_history" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "entidade_tipo" "HistoryEntity" NOT NULL,
    "entidade_id" UUID NOT NULL,
    "campo_alterado" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "alterado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_health_data" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "habito_id" UUID,
    "data" DATE NOT NULL,
    "passos" INTEGER NOT NULL,
    "calorias" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "imported_health_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "formato" "ExportFormat" NOT NULL,
    "incluir_anotacoes" BOOLEAN NOT NULL DEFAULT false,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "habits_usuario_id_status_idx" ON "habits"("usuario_id", "status");

-- CreateIndex
CREATE INDEX "habits_usuario_id_horario_preferido_idx" ON "habits"("usuario_id", "horario_preferido");

-- CreateIndex
CREATE INDEX "completion_records_data_idx" ON "completion_records"("data");

-- CreateIndex
CREATE UNIQUE INDEX "completion_records_habito_id_data_key" ON "completion_records"("habito_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "streaks_habito_id_key" ON "streaks"("habito_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_dependencies" ADD CONSTRAINT "habit_dependencies_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_dependencies" ADD CONSTRAINT "habit_dependencies_habito_gatilho_id_fkey" FOREIGN KEY ("habito_gatilho_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_conditions" ADD CONSTRAINT "habit_conditions_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_conditions" ADD CONSTRAINT "habit_conditions_condicao_habito_id_fkey" FOREIGN KEY ("condicao_habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subtasks" ADD CONSTRAINT "event_subtasks_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subtasks" ADD CONSTRAINT "event_subtasks_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_records" ADD CONSTRAINT "completion_records_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_records" ADD CONSTRAINT "completion_records_motivo_nao_conclusao_id_fkey" FOREIGN KEY ("motivo_nao_conclusao_id") REFERENCES "incompletion_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_consistency_goals" ADD CONSTRAINT "group_consistency_goals_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_challenges" ADD CONSTRAINT "temporary_challenges_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_habits" ADD CONSTRAINT "group_habits_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_habits" ADD CONSTRAINT "group_habits_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_suggestions" ADD CONSTRAINT "category_suggestions_categoria_sugerida_id_fkey" FOREIGN KEY ("categoria_sugerida_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_correlations" ADD CONSTRAINT "habit_correlations_habito_a_id_fkey" FOREIGN KEY ("habito_a_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_correlations" ADD CONSTRAINT "habit_correlations_habito_b_id_fkey" FOREIGN KEY ("habito_b_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_impacts" ADD CONSTRAINT "habit_impacts_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_templates" ADD CONSTRAINT "routine_templates_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_health_data" ADD CONSTRAINT "imported_health_data_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_health_data" ADD CONSTRAINT "imported_health_data_habito_id_fkey" FOREIGN KEY ("habito_id") REFERENCES "habits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
