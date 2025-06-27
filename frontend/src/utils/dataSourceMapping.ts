/**
 * Maps common data source names to their UUIDs in the database
 * This is needed because the UI shows friendly names but the API expects UUIDs
 */
export const DATA_SOURCE_MAPPING: Record<string, string> = {
  // Common abbreviations
  'NIH': '5d2ad9ba-b18c-4c6d-9926-e08e58d97a2e',
  'NSF': '2a7b0850-aaa7-49f0-8615-6797dc21e5b1',
  'DOE': '35662128-107f-450c-904e-feaeba3caa2c', // Grants.gov - includes DOE grants
  'USDA': '35662128-107f-450c-904e-feaeba3caa2c', // Grants.gov - includes USDA grants
  'NASA': '35662128-107f-450c-904e-feaeba3caa2c', // Grants.gov - includes NASA grants
  
  // Full names
  'California Grants Portal': '9d0483f6-0620-40ac-85f7-ccf047a2879b',
  'Canadian Open Government': '4f0acd83-72f4-4d98-b157-e8570c31d7f7',
  'EU Funding & Tenders Portal': 'cba84e15-d24d-4b27-81c0-24cc583fa0bb',
  'Federal Register': '2b1c9d18-38a3-4686-866d-9c9ec87a5693',
  'Grants.gov': '35662128-107f-450c-904e-feaeba3caa2c',
  'New York State Data': 'd044f897-bcd0-4aa6-aba6-8d9b3115773e',
  'NIH RePORTER': '5d2ad9ba-b18c-4c6d-9926-e08e58d97a2e',
  'NSF Awards': '2a7b0850-aaa7-49f0-8615-6797dc21e5b1',
  'OpenAlex': '3da411cd-5ecd-4832-920e-46726c69aed1',
  'SAM.gov Entity Management': '8c3b76b2-1b2e-4cce-88b2-80388e8d0f14',
  'UKRI Gateway to Research': 'ac988b94-b89a-4b17-acc5-a57f0f45cfa7',
  'USAspending.gov': 'd57417a7-e665-47f7-9432-6a64fea5155e',
  'World Bank Projects': '07fbd9b2-e725-470e-a527-a4d36c8706a2',
  
  // Database names (for consistency)
  'california_grants': '9d0483f6-0620-40ac-85f7-ccf047a2879b',
  'canadian_open_gov': '4f0acd83-72f4-4d98-b157-e8570c31d7f7',
  'eu_funding_portal': 'cba84e15-d24d-4b27-81c0-24cc583fa0bb',
  'federal_register': '2b1c9d18-38a3-4686-866d-9c9ec87a5693',
  'grants_gov': '35662128-107f-450c-904e-feaeba3caa2c',
  'ny_state': 'd044f897-bcd0-4aa6-aba6-8d9b3115773e',
  'nih_reporter': '5d2ad9ba-b18c-4c6d-9926-e08e58d97a2e',
  'nsf_awards': '2a7b0850-aaa7-49f0-8615-6797dc21e5b1',
  'openalex': '3da411cd-5ecd-4832-920e-46726c69aed1',
  'sam_gov': '8c3b76b2-1b2e-4cce-88b2-80388e8d0f14',
  'ukri_gateway': 'ac988b94-b89a-4b17-acc5-a57f0f45cfa7',
  'usaspending': 'd57417a7-e665-47f7-9432-6a64fea5155e',
  'world_bank': '07fbd9b2-e725-470e-a527-a4d36c8706a2'
};

/**
 * Maps a data source identifier to its UUID
 * Returns the original value if it's already a UUID or not found in mapping
 */
export function mapDataSourceToUUID(dataSource: string): string {
  // Check if it's already a UUID (basic check)
  if (dataSource.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return dataSource;
  }
  
  // Try to map it
  return DATA_SOURCE_MAPPING[dataSource] || dataSource;
}

/**
 * Maps an array of data sources to their UUIDs
 */
export function mapDataSourcesToUUIDs(dataSources: string[]): string[] {
  return dataSources.map(ds => mapDataSourceToUUID(ds));
}