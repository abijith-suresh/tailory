CREATE TABLE "mcp_activity" (
	"user_id" text PRIMARY KEY NOT NULL,
	"client" text,
	"tool" text NOT NULL,
	"called_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change" ADD COLUMN "review" text DEFAULT 'kept' NOT NULL;--> statement-breakpoint
ALTER TABLE "change" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "change" ADD COLUMN "reviewer_kind" text;--> statement-breakpoint
ALTER TABLE "change" ADD COLUMN "reviewer_client" text;--> statement-breakpoint
ALTER TABLE "mcp_activity" ADD CONSTRAINT "mcp_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;