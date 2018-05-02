#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigParser } from './Config';
import { Packager } from './Packager';
import { Deployer } from './Deployer';
import { Invoker } from './Invoker';
import { LogViewer } from './Logger';

const program = new Command();

program
  .name('sls-deploy')
  .description('Serverless deployment framework - deploy, invoke, and manage functions')
  .version('1.0.0');

program
  .command('deploy')
  .description('Deploy serverless functions')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .option('-r, --region <region>', 'Cloud region', 'us-east-1')
  .option('-f, --function <name>', 'Deploy a single function')
  .option('--dry-run', 'Preview deployment without executing')
  .option('--force', 'Force deploy even if no changes detected')
  .action(async (opts) => {
    const config = new ConfigParser();
    const serviceConfig = config.parse('./serverless.yml');

    const packager = new Packager();
    const deployer = new Deployer();

    const functions = opts.function
      ? [serviceConfig.functions.find((f) => f.name === opts.function)].filter(Boolean)
      : serviceConfig.functions;

    if (functions.length === 0) {
      console.error(`Function "${opts.function}" not found in configuration`);
      process.exit(1);
    }

    for (const func of functions) {
      if (!func) continue;
      console.log(`\nPackaging ${func.name}...`);
      const pkg = await packager.packageFunction(func, serviceConfig);
      console.log(`  Size: ${packager.formatSize(pkg.size)}`);

      if (!opts.dryRun) {
        console.log(`Deploying ${func.name} to ${opts.stage}/${opts.region}...`);
        const result = await deployer.deploy(pkg, {
          stage: opts.stage,
          region: opts.region,
          force: opts.force,
        });
        console.log(`  Status: ${result.status}`);
        if (result.url) console.log(`  URL: ${result.url}`);
      } else {
        console.log(`  [DRY RUN] Would deploy ${func.name}`);
      }
    }
  });

program
  .command('remove')
  .description('Remove deployed functions')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .option('-r, --region <region>', 'Cloud region', 'us-east-1')
  .option('-f, --function <name>', 'Remove a single function')
  .action(async (opts) => {
    const deployer = new Deployer();
    console.log(`Removing from ${opts.stage}/${opts.region}...`);
    await deployer.remove(opts.function, opts.stage, opts.region);
  });

program
  .command('invoke')
  .description('Invoke a function locally or remotely')
  .requiredOption('-f, --function <name>', 'Function to invoke')
  .option('-d, --data <json>', 'Event data as JSON string')
  .option('--local', 'Invoke locally instead of remotely')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .action(async (opts) => {
    const invoker = new Invoker();
    const eventData = opts.data ? JSON.parse(opts.data) : {};

    if (opts.local) {
      console.log(`Invoking ${opts.function} locally...`);
      const result = await invoker.invokeLocal(opts.function, eventData);
      console.log('\nResponse:', JSON.stringify(result.response, null, 2));
      console.log(`Duration: ${result.duration}ms`);
    } else {
      console.log(`Invoking ${opts.function} remotely (${opts.stage})...`);
      const result = await invoker.invokeRemote(opts.function, eventData, opts.stage);
      console.log('\nResponse:', JSON.stringify(result.response, null, 2));
    }
  });

program
  .command('logs')
  .description('View function logs')
  .requiredOption('-f, --function <name>', 'Function name')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .option('-t, --tail', 'Follow log output in real-time')
  .option('--start <time>', 'Start time (e.g., "5m", "1h", ISO date)')
  .option('--filter <pattern>', 'Filter logs by pattern')
  .action((opts) => {
    const viewer = new LogViewer();
    viewer.viewLogs({
      functionName: opts.function,
      stage: opts.stage,
      tail: opts.tail,
      startTime: opts.start,
      filter: opts.filter,
    });
  });

program
  .command('status')
  .description('Show deployment status')
  .option('-s, --stage <stage>', 'Deployment stage', 'dev')
  .option('-r, --region <region>', 'Cloud region', 'us-east-1')
  .action((opts) => {
    console.log(`\nService Status (${opts.stage} / ${opts.region})`);
    console.log('─'.repeat(40));
    console.log('Status:    deployed');
    console.log(`Stage:     ${opts.stage}`);
    console.log(`Region:    ${opts.region}`);
  });

program.parse(process.argv);
