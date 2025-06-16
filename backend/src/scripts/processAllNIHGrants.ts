import 'dotenv/config';
import { NIHListScraper } from '../services/scrapers/nihListScraper';
import { NIHDetailScraper } from '../services/scrapers/nihDetailScraper';
import { GeminiService } from '../services/ai/geminiService';
import { googleEmbeddingService } from '../services/ai/googleEmbeddingService';
import supabase from '../db/supabaseClient';
import logger from '../utils/logger';

interface ProcessingStats {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  startTime: Date;
}

async function processAllNIHGrants() {
  console.log('=== NIH Complete Grant Processing ===\n');

  // Check required environment variables
  const requiredEnvVars = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  const listScraper = new NIHListScraper();
  const detailScraper = new NIHDetailScraper();
  const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);

  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    startTime: new Date()
  };

  try {
    // Step 1: Get all NIH grant links
    console.log('STEP 1: Fetching all NIH grant links...');
    const grantLinks = await listScraper.scrapeGrantList();
    
    stats.total = grantLinks.length;
    console.log(`\n📋 Found ${stats.total} NIH grants to process`);
    
    if (stats.total === 0) {
      console.log('No grants found. Exiting.');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('STARTING GRANT PROCESSING');
    console.log('='.repeat(80));

    // Step 2: Process each grant
    for (let i = 0; i < grantLinks.length; i++) {
      const grantLink = grantLinks[i];
      const progress = `${i + 1}/${stats.total}`;
      
      console.log(`\n[${'█'.repeat(Math.floor((i / stats.total) * 20))}${' '.repeat(20 - Math.floor((i / stats.total) * 20))}] ${progress}`);
      console.log(`\n🔍 PROCESSING: ${grantLink.id}`);
      console.log(`🔗 URL: ${grantLink.url}`);

      try {
        // Check if grant already exists
        const { data: existingGrant, error: checkError } = await supabase
          .from('grants')
          .select('id, opportunity_id')
          .eq('opportunity_id', grantLink.id)
          .eq('data_source', 'NIH')
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking existing grant:', checkError);
          stats.failed++;
          continue;
        }
        
        if (existingGrant) {
          console.log(`⏭️  ALREADY EXISTS (ID: ${existingGrant.id}) - SKIPPING`);
          stats.skipped++;
          continue;
        }

        // Scrape grant details
        console.log('📄 Scraping grant page...');
        const scrapedPage = await detailScraper.scrapeGrantPage(grantLink.id, grantLink.url);
        
        // Process with Gemini AI
        console.log('🤖 Processing with AI...');
        const processedGrant = await geminiService.processGrantPage(scrapedPage, 'NIH');
        
        // Generate embeddings
        console.log('🔢 Generating embeddings...');
        const embeddingText = [
          processedGrant.title || '',
          processedGrant.description_short || '',
          processedGrant.category || '',
          processedGrant.grant_type || '',
          processedGrant.agency_name || '',
          ...(processedGrant.keywords || []),
          ...(processedGrant.eligible_applicants || [])
        ].filter(Boolean).join(' ');
        
        const embeddingResult = await googleEmbeddingService.generateEmbedding(embeddingText);
        
        // Store in database
        console.log('💾 Storing in database...');
        const grantForDatabase = {
          ...processedGrant,
          embeddings: embeddingResult.embedding,
          data_source: 'NIH'
        };
        
        const { contacts, ...grantWithoutContacts } = grantForDatabase;
        
        // Insert grant
        const { data: insertedGrant, error: insertError } = await supabase
          .from('grants')
          .insert(grantWithoutContacts)
          .select('id')
          .single();
        
        if (insertError) {
          console.error('❌ Error inserting grant:', insertError);
          stats.failed++;
          continue;
        }
        
        // Insert contacts
        if (contacts && contacts.length > 0) {
          const contactsForDatabase = contacts.map(contact => ({
            ...contact,
            grant_id: insertedGrant.id
          }));
          
          const { error: contactsError } = await supabase
            .from('grant_contacts')
            .insert(contactsForDatabase);
          
          if (contactsError) {
            console.error('⚠️  Warning: Error inserting contacts:', contactsError.message);
          } else {
            console.log(`📞 ${contacts.length} contacts stored`);
          }
        }
        
        console.log(`✅ SUCCESS! Stored with ID: ${insertedGrant.id}`);
        stats.processed++;
        
        // Rate limiting - wait between requests
        if (i < grantLinks.length - 1) {
          console.log('⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing grant ${grantLink.id}:`, error.message || error);
        stats.failed++;
      }
      
      // Progress update every 10 grants
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime.getTime()) / 1000;
        const rate = (i + 1) / elapsed;
        const remaining = stats.total - (i + 1);
        const eta = remaining / rate;
        
        console.log(`\n📊 PROGRESS UPDATE:`);
        console.log(`   Processed: ${i + 1}/${stats.total} (${Math.round(((i + 1) / stats.total) * 100)}%)`);
        console.log(`   Success: ${stats.processed} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`);
        console.log(`   Rate: ${rate.toFixed(1)} grants/sec`);
        console.log(`   ETA: ${Math.round(eta / 60)} minutes`);
      }
    }

    // Final summary
    const totalTime = (Date.now() - stats.startTime.getTime()) / 1000;
    console.log('\n' + '='.repeat(80));
    console.log('🎉 PROCESSING COMPLETE!');
    console.log('='.repeat(80));
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`   Total Grants: ${stats.total}`);
    console.log(`   Successfully Processed: ${stats.processed}`);
    console.log(`   Already Existed (Skipped): ${stats.skipped}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Total Time: ${Math.round(totalTime / 60)} minutes`);
    console.log(`   Average Rate: ${(stats.total / totalTime).toFixed(1)} grants/sec`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await listScraper.closeBrowser();
    await detailScraper.closeBrowser();
    console.log('✅ Cleanup complete!');
  }
}

// Run the script
processAllNIHGrants().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});