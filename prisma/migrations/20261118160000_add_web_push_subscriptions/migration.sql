CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key"
ON "WebPushSubscription"("endpoint");

CREATE INDEX "WebPushSubscription_userId_idx"
ON "WebPushSubscription"("userId");

ALTER TABLE "WebPushSubscription" DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN
        REVOKE ALL ON TABLE "WebPushSubscription" FROM anon, authenticated;
    END IF;
END $$;

ALTER TABLE "WebPushSubscription"
ADD CONSTRAINT "WebPushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
