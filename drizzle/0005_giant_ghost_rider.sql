CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"text_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_text_id_tasks_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_task_id_idx" ON "findings" USING btree ("text_id");