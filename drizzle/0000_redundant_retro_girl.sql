CREATE TYPE "public"."step_type" AS ENUM('PLAN', 'TOOL_CALL', 'MESSAGE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"index" integer NOT NULL,
	"type" "step_type" NOT NULL,
	"tool_name" text,
	"args" jsonb,
	"output_summary" text,
	"screenshot_path" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "steps_task_id_index_unique" UNIQUE("task_id","index")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"status" "task_status" DEFAULT 'QUEUED' NOT NULL,
	"plan" jsonb,
	"result" jsonb,
	"error" text,
	"max_steps" integer DEFAULT 40 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_task_id_created_at_idx" ON "findings" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "steps_task_id_created_at_idx" ON "steps" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_status_created_at_idx" ON "tasks" USING btree ("status","created_at");