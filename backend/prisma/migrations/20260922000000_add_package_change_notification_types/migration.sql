-- Package change request notification lifecycle.
ALTER TYPE "audit"."NotificationType" ADD VALUE 'package_change_request';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'package_change_approved';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'package_change_rejected';
