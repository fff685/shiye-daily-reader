-- AlterTable
ALTER TABLE "Book" ADD COLUMN "ownerId" TEXT;

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "targetLang" TEXT NOT NULL DEFAULT 'zh',
    "paragraphs" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Book_ownerId_idx" ON "Book"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_bookId_startOffset_endOffset_targetLang_key" ON "Translation"("bookId", "startOffset", "endOffset", "targetLang");

-- CreateIndex
CREATE INDEX "Translation_bookId_idx" ON "Translation"("bookId");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
