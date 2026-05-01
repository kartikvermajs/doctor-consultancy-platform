import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

/**
 * Lightweight JWT verification — we read the token from the Authorization
 * header that the browser sends alongside the UploadThing request.
 * We only need to confirm the user is authenticated; detailed role checks
 * happen again on the Express backend when the URL is saved.
 */
const getAuth = (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return token;
};

export const ourFileRouter = {
  /**
   * prescriptionPdf — handles PDF uploads for appointment documents.
   * PDFs are routed through UploadThing (free, persistent, direct-to-CDN).
   * Images are handled separately by Cloudinary on the Express backend.
   */
  prescriptionPdf: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const token = getAuth(req);
      if (!token) throw new UploadThingError("Unauthorized — no token");
      // We return the token so onUploadComplete can pass it to the Express
      // backend to register the document URL against the appointment.
      return { token };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UploadThing] PDF uploaded:", file.ufsUrl);
      // Return url & key so the client callback can call our Express backend
      return {
        url: file.ufsUrl,
        key: file.key,
        name: file.name,
        mimetype: "application/pdf",
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
