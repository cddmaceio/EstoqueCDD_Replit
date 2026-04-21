ALTER TABLE "admin_users" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_auth_user_id_unique" UNIQUE("auth_user_id");