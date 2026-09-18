import type { Metadata } from "next";
import { MediaLibraryView } from "@/components/media/media-library-view";

export const metadata: Metadata = {
  title: "Media Console · Super Admin",
  description: "Manage global media assets across all organisations",
};

export default function AdminMediaPage() {
  return <MediaLibraryView mode="admin" />;
}
