ALTER TABLE "findings" DROP CONSTRAINT "findings_text_id_tasks_id_fk";
--> statement-breakpoint
DROP INDEX "findings_task_id_idx";--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "task_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_task_id_idx" ON "findings" USING btree ("task_id");--> statement-breakpoint
ALTER TABLE "findings" DROP COLUMN "text_id";