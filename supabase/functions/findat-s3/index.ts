import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.750.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.750.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const endpoint = Deno.env.get("FINDAT_S3_ENDPOINT") ??
  "https://gmiqvpemuabjueyprwyl.storage.supabase.co/storage/v1/s3";
const region = Deno.env.get("FINDAT_S3_REGION") ?? "eu-west-1";
const bucket = Deno.env.get("FINDAT_S3_BUCKET") ?? "findat-documents";
const accessKeyId = Deno.env.get("FINDAT_S3_ACCESS_KEY_ID") ?? "";
const secretAccessKey = Deno.env.get("FINDAT_S3_SECRET_ACCESS_KEY") ?? "";
const maxFileBytes = Math.max(
  1,
  Number(Deno.env.get("FINDAT_MAX_FILE_BYTES") ?? 50 * 1024 * 1024),
);

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function validObjectPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.startsWith("objects/")) return false;
  if (value.length > 1024 || value.includes("\0")) return false;
  return !value.split("/").some((part) => part === ".." || part === "");
}

function safeContentType(value: unknown) {
  const contentType = typeof value === "string" ? value.trim() : "";
  return /^[\w.+-]+\/[\w.+-]+(?:;[\w .="'-]+)?$/.test(contentType)
    ? contentType
    : "application/octet-stream";
}

function validPublishableKey(request: Request) {
  const supplied = request.headers.get("apikey") ?? "";
  if (!supplied) return false;
  const accepted = new Set<string>();
  const single = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (single) accepted.add(single);
  try {
    const named = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    for (const value of Object.values(named)) {
      if (typeof value === "string") accepted.add(value);
    }
  } catch {
    // Hosted Supabase normally supplies valid JSON. A malformed local value is rejected.
  }
  return accepted.has(supplied);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  if (!validPublishableKey(request)) {
    return json(401, { error: "A valid Supabase Publishable key is required" });
  }
  if (!accessKeyId || !secretAccessKey) {
    return json(503, {
      error: "FINDAT S3 server credentials are not configured in Edge Function secrets",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "A valid JSON request body is required" });
  }

  try {
    switch (body.action) {
      case "health": {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        return json(200, {
          ok: true,
          provider: "Supabase Storage S3",
          bucket,
          region,
        });
      }

      case "sign-upload": {
        if (!validObjectPath(body.objectPath)) {
          return json(400, { error: "Invalid FINDAT object path" });
        }
        const size = Number(body.size ?? 0);
        if (!Number.isFinite(size) || size < 0 || size > maxFileBytes) {
          return json(413, { error: "Document exceeds the configured upload limit" });
        }
        const contentType = safeContentType(body.contentType);
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: body.objectPath,
          ContentType: contentType,
          CacheControl: "private, max-age=3600",
        });
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
        return json(200, {
          uploadUrl,
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
          },
          objectPath: body.objectPath,
          expiresIn: 900,
        });
      }

      case "sign-download": {
        if (!validObjectPath(body.objectPath)) {
          return json(400, { error: "Invalid FINDAT object path" });
        }
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: body.objectPath,
        });
        const downloadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
        return json(200, { downloadUrl, expiresIn: 900 });
      }

      case "delete": {
        const objectPaths = Array.isArray(body.objectPaths)
          ? [...new Set(body.objectPaths.filter(validObjectPath))]
          : [];
        if (!objectPaths.length) return json(200, { deleted: 0 });
        if (objectPaths.length > 1000) {
          return json(400, { error: "A maximum of 1000 objects can be deleted per request" });
        }
        const response = await client.send(new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Quiet: true,
            Objects: objectPaths.map((Key) => ({ Key })),
          },
        }));
        if (response.Errors?.length) {
          return json(502, {
            error: "One or more Storage objects could not be deleted",
            failures: response.Errors.map((item) => ({ key: item.Key, code: item.Code })),
          });
        }
        return json(200, { deleted: objectPaths.length });
      }

      default:
        return json(400, { error: "Unsupported FINDAT S3 action" });
    }
  } catch (error) {
    console.error("FINDAT S3 operation failed", error);
    const message = error instanceof Error ? error.message : "Unknown Storage error";
    return json(502, { error: `Supabase Storage S3 operation failed: ${message}` });
  }
});
