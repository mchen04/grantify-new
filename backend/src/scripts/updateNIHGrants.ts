import 'dotenv/config';
import { NIHListScraper } from '../services/scrapers/nihListScraper';
import { NIHDetailScraper } from '../services/scrapers/nihDetailScraper';
import { GeminiService } from '../services/ai/geminiService';
import { googleEmbeddingService } from '../services/ai/googleEmbeddingService';
import supabase from '../db/supabaseClient';

interface UpdateStats {
  checked: number;
  newGrants: number;
  updatedGrants: number;
  inactivatedGrants: number;
  reactivatedGrants: number;
  failed: number;
}

async function updateNIHGrants() {
  console.log('=== NIH Incremental Update ===\n');

  const listScraper = new NIHListScraper();
  const detailScraper = new NIHDetailScraper();
  const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);

  const stats: UpdateStats = {
    checked: 0,
    newGrants: 0,
    updatedGrants: 0,
    inactivatedGrants: 0,
    reactivatedGrants: 0,
    failed: 0
  };

  try {
    // Step 1: Get current active grants from website
    console.log('🔍 Fetching current NIH grants from website...');
    const websiteGrants = await listScraper.scrapeGrantList();
    const websiteGrantIds = new Set(websiteGrants.map(g => g.id));
    
    console.log(`📋 Found ${websiteGrants.length} grants on NIH website`);

    // Step 2: Get all grants from database
    console.log('🗃️  Fetching grants from database...');
    const { data: dbGrants, error: dbError } = await supabase
      .from('grants')
      .select('id, opportunity_id, status, updated_at')
      .eq('data_source', 'NIH');

    if (dbError) throw dbError;
    
    console.log(`💾 Found ${dbGrants?.length || 0} NIH grants in database`);

    // Step 3: Find grants to inactivate (in DB but not on website)
    const dbGrantIds = new Set(dbGrants?.map(g => g.opportunity_id) || []);
    const grantsToInactivate = dbGrants?.filter(g => 
      g.status !== 'inactive' && !websiteGrantIds.has(g.opportunity_id)
    ) || [];

    if (grantsToInactivate.length > 0) {
      console.log(`\n⚠️  Marking ${grantsToInactivate.length} grants as inactive...`);
      
      const { error: inactivateError } = await supabase
        .from('grants')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .in('opportunity_id', grantsToInactivate.map(g => g.opportunity_id));

      if (inactivateError) {
        console.error('❌ Error inactivating grants:', inactivateError);
      } else {
        stats.inactivatedGrants = grantsToInactivate.length;
        console.log(`✅ Marked ${grantsToInactivate.length} grants as inactive`);
      }
    }

    // Step 4: Find grants to reactivate (were inactive but now back on website)
    const grantsToReactivate = dbGrants?.filter(g => 
      g.status === 'inactive' && websiteGrantIds.has(g.opportunity_id)
    ) || [];

    if (grantsToReactivate.length > 0) {
      console.log(`\n🔄 Reactivating ${grantsToReactivate.length} grants...`);
      
      const { error: reactivateError } = await supabase
        .from('grants')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('opportunity_id', grantsToReactivate.map(g => g.opportunity_id));

      if (reactivateError) {
        console.error('❌ Error reactivating grants:', reactivateError);
      } else {
        stats.reactivatedGrants = grantsToReactivate.length;
        console.log(`✅ Reactivated ${grantsToReactivate.length} grants`);
      }
    }

    // Step 5: Process new grants (on website but not in DB)
    const newGrants = websiteGrants.filter(g => !dbGrantIds.has(g.id));
    
    console.log(`\n🆕 Processing ${newGrants.length} new grants...`);

    for (const [index, grantLink] of newGrants.entries()) {
      console.log(`\n[${index + 1}/${newGrants.length}] Processing: ${grantLink.id}`);
      
      try {
        // Scrape and process new grant
        const scrapedPage = await detailScraper.scrapeGrantPage(grantLink.id, grantLink.url);
        const processedGrant = await geminiService.processGrantPage(scrapedPage, 'NIH');
        
        // Generate embeddings
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
        const grantForDatabase = {
          ...processedGrant,
          embeddings: embeddingResult.embedding,
          data_source: 'NIH',
          status: 'active'
        };
        
        const { contacts, ...grantWithoutContacts } = grantForDatabase;
        
        // Insert grant
        const { data: insertedGrant, error: insertError } = await supabase
          .from('grants')
          .insert(grantWithoutContacts)
          .select('id')
          .single();
        
        if (insertError) throw insertError;
        
        // Insert contacts
        if (contacts && contacts.length > 0) {
          const contactsForDatabase = contacts.map(contact => ({
            ...contact,
            grant_id: insertedGrant.id
          }));
          
          await supabase.from('grant_contacts').insert(contactsForDatabase);
        }
        
        console.log(`✅ Added new grant: ${grantLink.id}`);
        stats.newGrants++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error(`❌ Error processing ${grantLink.id}:`, error.message);
        stats.failed++;
      }
    }

    // Step 6: Clean up old inactive grants (optional - older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: oldInactiveGrants } = await supabase
      .from('grants')
      .select('id, opportunity_id')
      .eq('data_source', 'NIH')
      .eq('status', 'inactive')
      .lt('updated_at', ninetyDaysAgo.toISOString());

    if (oldInactiveGrants && oldInactiveGrants.length > 0) {
      console.log(`\n🗑️  Found ${oldInactiveGrants.length} grants inactive for >90 days`);
      console.log('   Consider reviewing these for permanent deletion');
      // Uncomment to auto-delete:
      // await supabase.from('grants').delete().in('id', oldInactiveGrants.map(g => g.id));
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 UPDATE COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   New grants added: ${stats.newGrants}`);
    console.log(`   Grants reactivated: ${stats.reactivatedGrants}`);
    console.log(`   Grants inactivated: ${stats.inactivatedGrants}`);
    console.log(`   Processing failures: ${stats.failed}`);
    console.log(`   Old inactive grants: ${oldInactiveGrants?.length || 0} (>90 days)`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await listScraper.closeBrowser();
    await detailScraper.closeBrowser();
  }
}

// Run the update
updateNIHGrants().catch(error => {
  console.error('Update failed:', error);
  process.exit(1);
});