/*
  Warnings:

  - Added the required column `city` to the `organisations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "identity"."organisations" ADD COLUMN     "city" TEXT NOT NULL;
