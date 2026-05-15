import { retrieveRelevantDocuments, buildRAGContext } from './src/lib/rag.js';

async function test() {
  const docs = await retrieveRelevantDocuments("siapa adi muhamad?", 5);
  console.log("Docs retrieved:", docs.length);
  console.log(buildRAGContext(docs));
}

test().catch(console.error);
