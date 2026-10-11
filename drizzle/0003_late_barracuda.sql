ALTER TABLE "findings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "findings" CASCADE;--> statement-breakpoint
ALTER TABLE "steps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();