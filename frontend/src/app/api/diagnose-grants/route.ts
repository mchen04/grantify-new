import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || 'cancer';
    
    // Direct database queries to diagnose the issue
    
    // 1. Count total grants
    const { count: totalGrants } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true });
    
    // 2. Search for grants with 'cancer' in title
    const { data: titleMatches, count: titleCount } = await supabase
      .from('grants')
      .select('id, title, funding_organization_name, funding_amount_max')
      .ilike('title', `%${searchTerm}%`)
      .limit(20);
    
    // 3. Search for grants with 'cancer' in short description
    const { data: shortDescMatches, count: shortDescCount } = await supabase
      .from('grants')
      .select('id, title, funding_organization_name, funding_amount_max, summary')
      .ilike('summary', `%${searchTerm}%`)
      .limit(20);
    
    // 4. Search for grants with 'cancer' in full description
    const { data: fullDescMatches, count: fullDescCount } = await supabase
      .from('grants')
      .select('id, title, funding_organization_name, funding_amount_max')
      .ilike('description', `%${searchTerm}%`)
      .limit(20);
    
    // 5. Combined search (like the API does)
    const { data: combinedMatches, count: combinedCount } = await supabase
      .from('grants')
      .select('id, title, funding_organization_name, funding_amount_max, summary')
      .or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(20);
    
    // 6. Check for specific grant titles
    const specificTitles = [
      'Cancer Prevention and Control Clinical Trials Planning Grant Program',
      'Resource-Related Research Projects for Development of Animal Models'
    ];
    
    const { data: specificGrants } = await supabase
      .from('grants')
      .select('id, title, funding_organization_name, funding_amount_max')
      .in('title', specificTitles);
    
    // 7. Get a sample of grants with embeddings
    const { data: grantsWithEmbeddings, count: embeddingsCount } = await supabase
      .from('grants')
      .select('id, title, embeddings')
      .not('embeddings', 'is', null)
      .limit(5);
    
    return NextResponse.json({
      searchTerm,
      database: {
        totalGrants,
        grantsWithEmbeddings: embeddingsCount
      },
      searchResults: {
        titleMatches: {
          count: titleCount,
          grants: titleMatches?.map(g => ({ id: g.id, title: g.title }))
        },
        shortDescriptionMatches: {
          count: shortDescCount,
          grants: shortDescMatches?.map(g => ({ id: g.id, title: g.title, desc: g.summary?.substring(0, 100) + '...' }))
        },
        fullDescriptionMatches: {
          count: fullDescCount,
          grants: fullDescMatches?.map(g => ({ id: g.id, title: g.title }))
        },
        combinedSearch: {
          count: combinedCount,
          totalReturned: combinedMatches?.length,
          grants: combinedMatches?.map(g => ({ 
            id: g.id, 
            title: g.title,
            agency: g.funding_organization_name,
            amount: g.funding_amount_max,
            hasDescShort: !!g.summary
          }))
        }
      },
      specificGrantsCheck: {
        found: specificGrants?.length || 0,
        grants: specificGrants
      },
      analysis: {
        possibleIssues: [
          combinedCount === 2 ? `Only 2 grants contain '${searchTerm}' in searchable fields` : null,
          !embeddingsCount ? 'No grants have embeddings for semantic search' : null,
          combinedCount === 0 ? `No grants found containing '${searchTerm}'` : null,
          specificGrants?.length === 2 ? 'The two specific grants mentioned are in the database' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}