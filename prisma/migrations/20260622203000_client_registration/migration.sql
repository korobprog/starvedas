ALTER TABLE "ClientProfile" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
