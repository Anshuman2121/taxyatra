-- Drop table if it exists
DROP TABLE IF EXISTS "jurisdiction";

-- Recreate jurisdiction table with correct FK to person table
CREATE TABLE "jurisdiction" (
  "pan" TEXT PRIMARY KEY,
  "areaCd" TEXT,
  "areaDesc" TEXT,
  "aoType" TEXT,
  "rangeCd" TEXT,
  "aoNo" TEXT,
  "aoPplrName" TEXT,
  "aoEmailId" TEXT,
  "aoBldgId" TEXT,
  "aoBldgDesc" TEXT,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("pan") REFERENCES "person"("pan") ON DELETE CASCADE
);
