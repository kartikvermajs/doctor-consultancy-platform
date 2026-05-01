import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const getAuth = (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return token;
};

export const ourFileRouter = {
  

  prescriptionPdf: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const token = getAuth(req);
      if (!token) throw new UploadThingError("Unauthorized — no token");
      
      
      return { token };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UploadThing] PDF uploaded:", file.ufsUrl);
      
      return {
        url: file.ufsUrl,
        key: file.key,
        name: file.name,
        mimetype: "application/pdf",
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
