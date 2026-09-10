"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Uploads a builder image and resolves to its stored public URL, or null
 *  when no upload target is available (e.g. no active page yet) — callers
 *  fall back to the legacy base64 path in that case. */
export type BuilderImageUploader =
  | ((file: File) => Promise<string>)
  | null;

const BuilderUploadContext = createContext<BuilderImageUploader>(null);

export function BuilderUploadProvider({
  uploader,
  children,
}: {
  uploader: BuilderImageUploader;
  children: ReactNode;
}) {
  return (
    <BuilderUploadContext.Provider value={uploader}>
      {children}
    </BuilderUploadContext.Provider>
  );
}

export function useBuilderImageUpload(): BuilderImageUploader {
  return useContext(BuilderUploadContext);
}
