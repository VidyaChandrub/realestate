import type { Metadata } from "next";
import { MediaLibraryView } from "@/components/media/media-library-view";

export const metadata: Metadata = {
  title: "Media Library · iPixxel Realty",
  description: "Manage organisation media assets, images, logos, and documents",
};

export default function OrgMediaPage() {
  return <MediaLibraryView mode="org" />;
}
