import supabaseClient from '../db/supabaseClient';
import { embeddingService } from '../services/ai/embeddingServiceWrapper';
import logger from '../utils/logger';

/**
 * Script to check grant embeddings status and populate missing ones
 */
async function checkAndPopulateEmbeddings() {
  try {
    logger.info('Starting embeddings check...');
    
    // First, check how many grants have embeddings
    const { count: totalGrants } = await supabaseClient
      .from('grants')
      .select('*', { count: 'exact', head: true });
    
    const { count: grantsWithEmbeddings } = await supabaseClient
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .not('embeddings', 'is', null);
    
    logger.info(`Total grants: ${totalGrants}`);
    logger.info(`Grants with embeddings: ${grantsWithEmbeddings}`);
    logger.info(`Grants missing embeddings: ${totalGrants! - grantsWithEmbeddings!}`);
    
    // Get a sample of grants without embeddings
    const { data: sampleGrants } = await supabaseClient
      .from('grants')
      .select('id, title, description_short, agency_name')
      .is('embeddings', null)
      .limit(5);
    
    if (sampleGrants && sampleGrants.length > 0) {
      logger.info('\nSample of grants missing embeddings:');
      sampleGrants.forEach(grant => {
        logger.info(`- ${grant.id}: ${grant.title.substring(0, 50)}...`);
      });
    }
    
    // Check if we should populate embeddings
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('\nDo you want to populate embeddings for grants missing them? (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'yes') {
      await populateMissingEmbeddings();
    }
    
  } catch (error) {
    logger.error('Error checking embeddings:', error);
  }
}

async function populateMissingEmbeddings() {
  try {
    logger.info('\nStarting to populate missing embeddings...');
    
    // Get all grants without embeddings
    const { data: grants, error } = await supabaseClient
      .from('grants')
      .select('id, title, description_short, description_full, keywords, agency_name')
      .is('embeddings', null)
      .order('created_at', { ascending: false })
      .limit(100); // Process in batches to avoid rate limits
    
    if (error) {
      throw error;
    }
    
    if (!grants || grants.length === 0) {
      logger.info('No grants missing embeddings!');
      return;
    }
    
    logger.info(`Processing ${grants.length} grants...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const grant of grants) {
      try {
        // Create embedding text from grant data
        const embeddingText = createEmbeddingText(grant);
        
        // Generate embedding
        const embeddings = await embeddingService.generateEmbedding(embeddingText);
        
        // Update grant with embeddings
        const { error: updateError } = await supabaseClient
          .from('grants')
          .update({ embeddings: JSON.stringify(embeddings) })
          .eq('id', grant.id);
        
        if (updateError) {
          throw updateError;
        }
        
        successCount++;
        logger.info(`✓ Updated embeddings for grant ${grant.id} (${successCount}/${grants.length})`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
      } catch (error) {
        errorCount++;
        logger.error(`✗ Failed to update embeddings for grant ${grant.id}:`, error);
      }
    }
    
    logger.info(`\nCompleted! Success: ${successCount}, Errors: ${errorCount}`);
    
  } catch (error) {
    logger.error('Error populating embeddings:', error);
  }
}

function createEmbeddingText(grant: any): string {
  // Combine key fields for embedding generation
  const parts = [
    grant.title,
    grant.description_short || '',
    grant.description_full?.substring(0, 1000) || '', // Limit length
    grant.agency_name || '',
    grant.keywords?.join(' ') || ''
  ];
  
  return parts.filter(Boolean).join(' ');
}

// Run the script
checkAndPopulateEmbeddings()
  .then(() => {
    logger.info('Script completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
  });