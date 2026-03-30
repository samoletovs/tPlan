# Phase 3 Architecture: Book-to-Coach Pipeline

> Decision document. No code changes — planning only.

## Current State (What Exists)

### Backend (Ready)
- **`api/src/services/extraction.ts`** — Full AI extraction service using Azure OpenAI GPT-4o. Sends book text + structured prompt, receives JSON program. Includes validation + confidence scoring. **Production-ready.**
- **`api/src/services/pdf-parser.ts`** — PDF text extraction using `pdf-parse` with ESM/CJS interop fix. **Production-ready.**
- **`api/src/functions/program-management.ts`** — POST `/api/programs/extract` endpoint. Accepts `{ text, fileName }`, calls extraction service, returns structured program.

### Frontend (80% Done)
- **`src/pages/UploadProgram.tsx`** — File upload UI with drag-and-drop. Sends text to extract API, shows results with confidence bar and warnings. User can review exercises before saving. **Needs: PDF handling (currently text-only on frontend), better UX for review/edit flow.**

### What's Missing

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| Azure Blob Storage for file uploads | Not started | M | Currently sending raw text in POST body. For PDFs >1MB, need a proper upload pipeline |
| PDF upload (frontend) | Partial | S | Frontend reads `.txt/.md` but PDF needs base64 encoding or Blob upload URL |
| Program review/edit before save | Partial | M | Extraction results displayed but can't be edited inline yet |
| Error handling for large books | Partial | S | Text truncated at 80K chars. Need user warning + chunked extraction for very large books |
| Multi-book program merging | Not started | L | Phase 3+ — combine exercises from multiple books into one program |

## Architecture Decision: Upload Pipeline

### Option A: Direct POST (Current)
- Frontend reads file → sends text in request body
- Simple, works for `.txt` and `.md`
- **Limitation**: POST body max ~4MB on Azure SWA. PDFs can be 10MB+

### Option B: Blob Storage Upload (Recommended for Phase 3)
1. Frontend requests a SAS upload URL from API
2. Frontend uploads file directly to Azure Blob Storage
3. Frontend notifies API: "file at blob URL, extract it"
4. API downloads from Blob, extracts text (PDF or text), runs AI extraction
5. Returns structured program

**Why**: Handles large files, allows async processing, keeps file for re-extraction if needed.

### Infrastructure Needed

```bicep
// Add to infrastructure/main.bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'tplanbooks${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: 'uploads'
  properties: { publicAccess: 'None' }
}
```

- Storage: `tplanbooks<unique>` (Standard_LRS, ~$0.02/GB/month — negligible cost)
- Container: `uploads/` with private access
- SAS tokens: 1-hour expiry, write-only for upload, read for API extraction
- Cleanup: Azure lifecycle policy deletes blobs after 7 days (books not stored permanently)

## Extraction Quality Strategy

### Tested (Convict Conditioning)
- 6 exercises, 10 levels each, complete technique descriptions
- Confidence: 90-95%
- Works because CC has very structured progression tables

### To Test

| Book | Type | Challenge |
|------|------|-----------|
| Starting Strength (Mark Rippetoe) | Barbell | Linear progression model, sets × reps × weight, different structure than CC |
| Yoga Anatomy (Leslie Kaminoff) | Yoga | Flow sequences, not discrete levels. Hold times, breathing patterns |
| 5/3/1 (Jim Wendler) | Barbell | Percentage-based programming. Needs weight calculations, not just reps |
| Convict Conditioning Vol 2 | Calisthenics | Already in `/materials/`. Good baseline test for second extraction |

### Extraction Prompt Improvements Needed
1. **Handle percentage-based programs** (5/3/1, Wendler) — extract weight percentages as progression rules
2. **Handle flow/sequence programs** (yoga, martial arts) — extract sequences with hold times
3. **Better default schedule detection** — many books describe "3 days a week" without specifying days
4. **Equipment requirements** — extract what equipment is needed per exercise

## User Flow: Upload → Review → Save

```
1. User navigates to Programs → Upload
2. Drops/selects file (.txt, .md, .pdf)
3. Loading state: "Extracting program from [filename]..."
4. Results displayed:
   ┌─────────────────────────────────────┐
   │ Confidence: ████████░░ 82%          │
   │                                     │
   │ ⚠ 2 warnings:                       │
   │ • Exercise "wall sit" has minimal   │
   │   technique description             │
   │ • No progression rules found -      │
   │   using defaults                    │
   │                                     │
   │ Program: Starting Strength          │
   │ Type: weights                       │
   │ 5 exercises, 15 levels              │
   │                                     │
   │ [Review Exercises]  [Save Program]  │
   │         [Re-extract]                │
   └─────────────────────────────────────┘
5. "Review Exercises" → expandable list with edit capability
6. "Save Program" → creates program, redirects to Programs page
7. "Re-extract" → re-sends text with user prompt ("focus on the squat section")
```

## Success Criteria

Phase 3 is done when:
1. User can upload a PDF and get a usable program without manual config
2. Extraction works for 2+ different book types (calisthenics + barbell minimum)
3. Confidence score accurately reflects extraction quality
4. User can review and edit extracted exercises before saving
5. Generated programs produce valid workouts in the workout execution flow

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| Azure Blob Storage (Standard_LRS) | ~$0.02 (< 1GB of books) |
| Azure OpenAI GPT-4o (extraction) | ~$0.50 per book extraction (8K output tokens) |
| Total Phase 3 infra | < $1/month for personal use |

## Timeline Recommendation

1. **First**: Test extraction with CC Vol 2 and one barbell book (validate prompt quality)
2. **Then**: Implement Blob Storage upload pipeline (if PDF sizes are an issue)
3. **Then**: Complete UploadProgram.tsx review/edit flow
4. **Last**: Test with yoga/martial arts book (the hardest paradigm for extraction)
