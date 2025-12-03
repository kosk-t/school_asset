#!/usr/bin/env npx tsx
/**
 * Knowledge Chunk Extraction Script
 *
 * This script extracts knowledge chunks from educational HTML files and:
 * 1. Outputs a static knowledge_chunks.json file (for fallback/backup)
 * 2. Optionally uploads to Supabase with embeddings
 *
 * Usage:
 *   npx tsx scripts/extract-chunks.ts                    # Generate JSON only
 *   npx tsx scripts/extract-chunks.ts --upload           # Generate JSON and upload to Supabase
 *   npx tsx scripts/extract-chunks.ts --upload --dry-run # Preview without actual upload
 *
 * Environment variables (required for --upload):
 *   SUPABASE_URL        - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 *   OPENAI_API_KEY      - OpenAI API key for embeddings
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import * as yaml from "js-yaml";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface KnowledgeChunk {
  id: string;
  material: string;
  anchor: string;
  title: string;
  content: string;
  learns: string[];
  type: "rule" | "method" | "definition" | "example" | "tip";
  category: string;
  level: string;
  prerequisites: string[];
  embedding?: number[];
}

interface MaterialFrontMatter {
  title: string;
  category: string;
  level: string;
  keywords?: string[];
}

interface ChunkElement {
  id: string;
  element: Element;
  type: KnowledgeChunk["type"];
}

// Constants
const DOCS_DIR = path.join(__dirname, "..", "docs");
const OUTPUT_FILE = path.join(__dirname, "..", "docs", "_data", "knowledge_chunks.json");
const LEARNS_FILE = path.join(__dirname, "..", "docs", "_data", "learns.yml");
const MATERIAL_GLOB = "*_教材.html";

// Type for learns.yml structure
type LearnsData = Record<string, Record<string, string[]>>;

// Global learns data (loaded once)
let learnsData: LearnsData = {};

/**
 * Load learns.yml if it exists
 */
function loadLearnsData(): LearnsData {
  if (!fs.existsSync(LEARNS_FILE)) {
    console.log("learns.yml not found, using heuristic generation");
    return {};
  }

  try {
    const content = fs.readFileSync(LEARNS_FILE, "utf-8");
    const data = yaml.load(content) as LearnsData;
    console.log(`Loaded learns.yml with ${Object.keys(data).length} materials`);
    return data;
  } catch (error) {
    console.warn(`Failed to load learns.yml: ${error}`);
    return {};
  }
}

/**
 * Get learns from learns.yml or fall back to heuristic generation
 */
function getLearns(material: string, anchor: string, content: string, title: string): string[] {
  // Try to get from learns.yml first
  const materialLearns = learnsData[material];
  if (materialLearns && materialLearns[anchor]) {
    return materialLearns[anchor];
  }

  // Fall back to heuristic generation
  return generateLearnsHeuristic(content, title);
}

// ID prefix to type mapping
const ID_TYPE_MAP: Record<string, KnowledgeChunk["type"]> = {
  rule: "rule",
  method: "method",
  def: "definition",
  ex: "example",
  tip: "tip",
};

/**
 * Parse front matter from HTML file
 */
function parseFrontMatter(content: string): MaterialFrontMatter | null {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  try {
    const data = yaml.load(match[1]) as Record<string, unknown>;
    return {
      title: data.title as string || "",
      category: data.category as string || "",
      level: data.level as string || "標準",
      keywords: data.keywords as string[] || [],
    };
  } catch {
    console.error("Failed to parse front matter");
    return null;
  }
}

/**
 * Determine chunk type from ID
 */
function getChunkType(id: string): KnowledgeChunk["type"] | null {
  for (const [prefix, type] of Object.entries(ID_TYPE_MAP)) {
    if (id.startsWith(`${prefix}-`)) {
      return type;
    }
  }
  return null;
}

/**
 * Extract text content from an element, removing HTML tags and normalizing whitespace
 */
function extractTextContent(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element;

  // Remove script and style elements
  clone.querySelectorAll("script, style, svg").forEach((el) => el.remove());

  // Remove details/summary (thinking sections)
  clone.querySelectorAll("details").forEach((el) => el.remove());

  // Get text content and normalize whitespace
  let text = clone.textContent || "";
  text = text.replace(/\s+/g, " ").trim();

  // Remove excessive newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
}

/**
 * Extract the title from a chunk element
 */
function extractTitle(element: Element): string {
  // Look for strong or bold text at the beginning
  const strongEl = element.querySelector("strong");
  if (strongEl) {
    let title = strongEl.textContent?.trim() || "";
    // Remove emoji prefix like "📌 "
    title = title.replace(/^[^\w\s一-龯ぁ-んァ-ン]+\s*/, "");
    return title;
  }

  // Fallback to first text content
  const text = extractTextContent(element);
  const firstLine = text.split("\n")[0] || text.substring(0, 50);
  return firstLine.replace(/^[^\w\s一-龯ぁ-んァ-ン]+\s*/, "");
}

/**
 * Generate learns array from content using simple heuristics (fallback)
 */
function generateLearnsHeuristic(content: string, title: string): string[] {
  const learns: string[] = [];

  // Add title-based learn
  if (title) {
    learns.push(`${title}について理解する`);
  }

  // Extract key points from content
  // Look for patterns like "〜の方法", "〜のルール", "〜の公式"
  const patterns = [
    /([一-龯ぁ-んァ-ン\w]+の(方法|ルール|公式|定理|法則|条件|性質))/g,
    /([一-龯ぁ-んァ-ン\w]+を(求める|計算する|証明する|解く))/g,
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches.slice(0, 3)) {
        if (!learns.includes(match)) {
          learns.push(match);
        }
      }
    }
  }

  return learns.slice(0, 5); // Limit to 5 learns
}

/**
 * Find all chunk elements in the document
 */
function findChunkElements(document: Document): ChunkElement[] {
  const chunks: ChunkElement[] = [];

  // Find elements with semantic IDs
  const allElements = document.querySelectorAll("[id]");

  for (const element of allElements) {
    const id = element.getAttribute("id");
    if (!id) continue;

    const type = getChunkType(id);
    if (type) {
      chunks.push({ id, element, type });
    }
  }

  return chunks;
}

/**
 * Process a single HTML file and extract chunks
 */
function processFile(filePath: string): KnowledgeChunk[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath, ".html");

  // Parse front matter
  const frontMatter = parseFrontMatter(content);
  if (!frontMatter) {
    console.warn(`Skipping ${fileName}: No front matter found`);
    return [];
  }

  // Parse HTML (remove front matter first, handling both Unix and Windows line endings)
  const htmlContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---[\r\n]*/, "");
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Find chunk elements
  const chunkElements = findChunkElements(document);
  const chunks: KnowledgeChunk[] = [];

  for (const { id, element, type } of chunkElements) {
    const title = extractTitle(element);
    const textContent = extractTextContent(element);

    // Skip if content is too short
    if (textContent.length < 20) {
      console.warn(`Skipping ${fileName}#${id}: Content too short`);
      continue;
    }

    const chunk: KnowledgeChunk = {
      id: `${fileName}#${id}`,
      material: fileName,
      anchor: id,
      title,
      content: textContent,
      learns: getLearns(fileName, id, textContent, title),
      type,
      category: frontMatter.category,
      level: frontMatter.level,
      prerequisites: [],
    };

    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

/**
 * Upload chunks to Supabase
 */
async function uploadToSupabase(chunks: KnowledgeChunk[], dryRun: boolean): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required");
  }

  console.log(`\nUploading ${chunks.length} chunks to Supabase...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[${i + 1}/${chunks.length}] Processing: ${chunk.id}`);

    // Generate embedding
    const embeddingText = `${chunk.title}\n${chunk.learns.join("\n")}\n${chunk.content}`;
    console.log(`  Generating embedding for ${embeddingText.length} chars...`);

    if (!dryRun) {
      try {
        chunk.embedding = await generateEmbedding(embeddingText.substring(0, 8000));
      } catch (error) {
        console.error(`  Error generating embedding: ${error}`);
        continue;
      }

      // Upsert to Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/knowledge_chunks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: chunk.id,
          material: chunk.material,
          anchor: chunk.anchor,
          title: chunk.title,
          content: chunk.content,
          learns: chunk.learns,
          type: chunk.type,
          category: chunk.category,
          level: chunk.level,
          prerequisites: chunk.prerequisites,
          embedding: chunk.embedding,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`  Error uploading: ${error}`);
      } else {
        console.log(`  Uploaded successfully`);
      }

      // Rate limit: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else {
      console.log(`  [DRY RUN] Would generate embedding and upload`);
    }
  }

  console.log("\nUpload complete!");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldUpload = args.includes("--upload");
  const dryRun = args.includes("--dry-run");

  console.log("Knowledge Chunk Extraction Script");
  console.log("=".repeat(40));
  console.log(`Mode: ${shouldUpload ? (dryRun ? "Upload (DRY RUN)" : "Upload") : "JSON only"}`);
  console.log("");

  // Load learns.yml if available
  learnsData = loadLearnsData();

  // Find all material files
  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith("_教材.html"));
  console.log(`Found ${files.length} material files`);

  // Process each file
  const allChunks: KnowledgeChunk[] = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    console.log(`\nProcessing: ${file}`);

    const chunks = processFile(filePath);
    console.log(`  Extracted ${chunks.length} chunks`);

    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks extracted: ${allChunks.length}`);

  // Write JSON file (without embeddings for smaller file size)
  const jsonChunks = allChunks.map(({ embedding, ...rest }) => rest);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonChunks, null, 2), "utf-8");
  console.log(`\nWrote ${OUTPUT_FILE}`);

  // Upload to Supabase if requested
  if (shouldUpload) {
    await uploadToSupabase(allChunks, dryRun);
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log("Summary by type:");
  const byType = allChunks.reduce(
    (acc, chunk) => {
      acc[chunk.type] = (acc[chunk.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nSummary by category:");
  const byCategory = allChunks.reduce(
    (acc, chunk) => {
      acc[chunk.category] = (acc[chunk.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`  ${category}: ${count}`);
  }
}

// Run
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
