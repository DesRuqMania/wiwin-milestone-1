CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE "UserRole" AS ENUM ('ADMIN','EDITOR','RESEARCH_OFFICER','PRODUCER','CONTENT_EDITOR');
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFORMATION_REQUIRED','SHORTLISTED','APPROVED','INVITED','ACCEPTED','SCHEDULED','INTERVIEWED','DECLINED','NOT_SELECTED');
CREATE TYPE "NominationStatus" AS ENUM ('SUBMITTED','UNDER_REVIEW','CONTACT_REQUIRED','CONVERTED','DECLINED');
CREATE TYPE "NasarawaConnection" AS ENUM ('INDIGENE','BORN_IN_NASARAWA','LIVES_IN_NASARAWA','WORKS_IN_NASARAWA','CONTRIBUTOR');
CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "full_name" VARCHAR(150) NOT NULL,
  "email" VARCHAR(255) NOT NULL, "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'ADMIN', "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL, "description" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE TABLE "applicants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reference_number" VARCHAR(30) NOT NULL,
  "full_name" VARCHAR(150) NOT NULL, "email" VARCHAR(255) NOT NULL, "phone" VARCHAR(30) NOT NULL,
  "date_of_birth" DATE, "location" VARCHAR(150) NOT NULL, "lga" VARCHAR(100),
  "nasarawa_connection" "NasarawaConnection" NOT NULL, "profession" VARCHAR(150) NOT NULL,
  "category_id" UUID NOT NULL, "achievements" TEXT NOT NULL, "proposed_topic" TEXT NOT NULL,
  "motivation" TEXT NOT NULL, "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "privacy_consent" BOOLEAN NOT NULL DEFAULT false, "media_consent" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "applicants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "applicants_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "applicants_reference_number_key" ON "applicants"("reference_number");
CREATE INDEX "applicants_status_created_at_idx" ON "applicants"("status","created_at");
CREATE INDEX "applicants_email_idx" ON "applicants"("email");
CREATE TABLE "nominations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reference_number" VARCHAR(30) NOT NULL,
  "nominator_name" VARCHAR(150) NOT NULL, "nominator_email" VARCHAR(255) NOT NULL,
  "nominee_name" VARCHAR(150) NOT NULL, "nominee_email" VARCHAR(255),
  "nominee_profession" VARCHAR(150), "nominee_location" VARCHAR(150), "reason" TEXT NOT NULL,
  "supporting_url" TEXT, "status" "NominationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nominations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "nominations_reference_number_key" ON "nominations"("reference_number");
CREATE INDEX "nominations_status_created_at_idx" ON "nominations"("status","created_at");
CREATE TABLE "application_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "applicant_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "note" TEXT, "from_status" "ApplicationStatus", "to_status" "ApplicationStatus" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_reviews_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "application_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "application_reviews_applicant_id_created_at_idx" ON "application_reviews"("applicant_id","created_at");
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID,
  "action" VARCHAR(100) NOT NULL, "resource_type" VARCHAR(100) NOT NULL,
  "resource_id" UUID, "details" JSONB, "ip_address" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type","resource_id");
