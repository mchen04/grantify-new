#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config();

import { GrantLoader } from '../src/services/grants/grantLoader';
import logger from '../src/utils/logger';
import chalk from 'chalk';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const loader = new GrantLoader();

  console.log(chalk.blue('\n🚀 Grant Management CLI\n'));

  try {
    switch (command) {
      case 'load-all':
        await loadAll(loader);
        break;
        
      case 'update':
        await update(loader);
        break;
        
      case 'status':
        await showStatus(loader);
        break;
        
      case 'load-source':
        const source = args[1];
        if (!source) {
          console.error(chalk.red('Please specify a data source name'));
          process.exit(1);
        }
        await loadSource(loader, source);
        break;
        
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    logger.error('Command failed:', error);
    console.error(chalk.red('\n❌ Command failed. Check logs for details.'));
    process.exit(1);
  }
}

async function loadAll(loader: GrantLoader) {
  console.log(chalk.yellow('Loading all grants from all APIs...\n'));
  
  const startTime = Date.now();
  const results = await loader.loadAll();
  const duration = Date.now() - startTime;
  
  // Display results
  console.log(chalk.green('\n✅ Loading Complete!\n'));
  console.log(chalk.cyan('Summary by Source:'));
  console.log('─'.repeat(80));
  
  let totalGrants = 0;
  let totalLoaded = 0;
  let totalErrors = 0;
  
  for (const result of results) {
    totalGrants += result.total;
    totalLoaded += result.loaded + result.updated;
    totalErrors += result.errors;
    
    const status = result.errors > 0 ? chalk.yellow('⚠') : chalk.green('✓');
    console.log(
      `${status} ${result.source.padEnd(20)} | ` +
      `Total: ${result.total.toString().padStart(6)} | ` +
      `New: ${result.loaded.toString().padStart(6)} | ` +
      `Updated: ${result.updated.toString().padStart(6)} | ` +
      `Errors: ${result.errors > 0 ? chalk.red(result.errors.toString()) : '0'}`
    );
  }
  
  console.log('─'.repeat(80));
  console.log(
    chalk.bold('Total:'.padEnd(23)) +
    `Total: ${totalGrants.toString().padStart(6)} | ` +
    `Loaded: ${totalLoaded.toString().padStart(6)} | ` +
    `Errors: ${totalErrors > 0 ? chalk.red(totalErrors.toString()) : '0'}`
  );
  
  console.log(chalk.gray(`\nCompleted in ${Math.round(duration / 1000)}s`));
}

async function update(loader: GrantLoader) {
  console.log(chalk.yellow('Running incremental update (last 7 days)...\n'));
  
  const startTime = Date.now();
  const results = await loader.update();
  const duration = Date.now() - startTime;
  
  // Display results
  console.log(chalk.green('\n✅ Update Complete!\n'));
  console.log(chalk.cyan('Updates by Source:'));
  console.log('─'.repeat(60));
  
  let totalUpdated = 0;
  
  for (const result of results) {
    if (result.total > 0) {
      totalUpdated += result.loaded + result.updated;
      console.log(
        `${result.source.padEnd(20)} | ` +
        `Found: ${result.total.toString().padStart(5)} | ` +
        `Updated: ${(result.loaded + result.updated).toString().padStart(5)}`
      );
    }
  }
  
  console.log('─'.repeat(60));
  console.log(chalk.bold(`Total Updated: ${totalUpdated}`));
  console.log(chalk.gray(`\nCompleted in ${Math.round(duration / 1000)}s`));
}

async function showStatus(loader: GrantLoader) {
  console.log(chalk.yellow('Fetching database status...\n'));
  
  const stats = await loader.getStats();
  
  console.log(chalk.cyan('📊 Grant Database Status'));
  console.log('─'.repeat(60));
  console.log(`Total Grants: ${chalk.bold(stats.totalGrants || 0)}`);
  
  if (stats.bySource && stats.bySource.length > 0) {
    console.log('\nGrants by Source:');
    for (const source of stats.bySource) {
      console.log(`  ${source.source_name}: ${source.grant_count}`);
    }
  }
  
  if (stats.dataSources && stats.dataSources.length > 0) {
    console.log('\nData Source Status:');
    console.log('─'.repeat(60));
    
    for (const ds of stats.dataSources) {
      const lastSync = ds.last_successful_sync 
        ? new Date(ds.last_successful_sync).toLocaleString()
        : 'Never';
      
      console.log(`\n${chalk.bold(ds.name)}`);
      console.log(`  Last Sync: ${lastSync}`);
      console.log(`  Fetched: ${ds.total_grants_fetched || 0}`);
      console.log(`  Loaded: ${ds.total_grants_loaded || 0}`);
    }
  }
}

async function loadSource(loader: GrantLoader, sourceName: string) {
  console.log(chalk.yellow(`Loading grants from ${sourceName}...\n`));
  
  // This would need to be implemented in the GrantLoader class
  console.log(chalk.red('Single source loading not yet implemented'));
}

function showHelp() {
  console.log(chalk.cyan('Available Commands:'));
  console.log('  load-all     - Load all grants from all APIs');
  console.log('  update       - Run incremental update (last 7 days)');
  console.log('  status       - Check database status');
  console.log('  load-source  - Load grants from a specific source');
  console.log('\nExamples:');
  console.log('  npm run grants:load-all');
  console.log('  npm run grants:update');
  console.log('  npm run grants:status');
}

// Run the CLI
main().catch(error => {
  logger.error('Fatal error:', error);
  console.error(chalk.red('\n❌ Fatal error occurred'));
  process.exit(1);
});