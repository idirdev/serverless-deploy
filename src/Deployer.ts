import * as fs from 'fs';
import { DeployResult, PackageResult, StageConfig } from './types';

interface DeploymentRecord {
  functionName: string;
  version: string;
  stage: string;
  region: string;
  hash: string;
  deployedAt: Date;
  size: number;
  status: 'active' | 'rolled-back';
}

export class Deployer {
  private deployments: Map<string, DeploymentRecord[]> = new Map();
  private activeVersions: Map<string, string> = new Map(); // funcName:stage -> version

  async deploy(pkg: PackageResult, stageConfig: StageConfig): Promise<DeployResult> {
    const startTime = Date.now();
    const deployKey = `${pkg.functionName}:${stageConfig.stage}`;

    try {
      // Check if function has changed
      if (!stageConfig.force) {
        const currentVersion = this.activeVersions.get(deployKey);
        if (currentVersion) {
          const history = this.deployments.get(deployKey) ?? [];
          const current = history.find((d) => d.version === currentVersion);
          if (current && current.hash === pkg.hash) {
            return {
              functionName: pkg.functionName,
              status: 'unchanged',
              version: currentVersion,
              duration: Date.now() - startTime,
            };
          }
        }
      }

      // Validate package exists
      if (!fs.existsSync(pkg.zipPath + '.manifest.json')) {
        throw new Error(`Package not found: ${pkg.zipPath}`);
      }

      // Simulate upload
      await this.uploadPackage(pkg);

      // Create or update function
      const version = this.generateVersion();
      const isNew = !this.activeVersions.has(deployKey);

      // Configure environment and triggers
      await this.configureFunction(pkg, stageConfig, version);

      // Record deployment
      const record: DeploymentRecord = {
        functionName: pkg.functionName,
        version,
        stage: stageConfig.stage,
        region: stageConfig.region,
        hash: pkg.hash,
        deployedAt: new Date(),
        size: pkg.size,
        status: 'active',
      };

      const history = this.deployments.get(deployKey) ?? [];
      history.push(record);
      this.deployments.set(deployKey, history);
      this.activeVersions.set(deployKey, version);

      // Simulate health check
      const healthy = await this.healthCheck(pkg.functionName, stageConfig);
      if (!healthy) {
        // Rollback on health check failure
        await this.rollback(pkg.functionName, stageConfig.stage, stageConfig.region);
        return {
          functionName: pkg.functionName,
          status: 'failed',
          error: 'Health check failed, rolled back to previous version',
          duration: Date.now() - startTime,
        };
      }

      const domain = `${stageConfig.stage === 'prod' ? '' : `${stageConfig.stage}.`}api.example.com`;

      return {
        functionName: pkg.functionName,
        status: isNew ? 'created' : 'updated',
        url: `https://${domain}/${pkg.functionName}`,
        version,
        size: pkg.size,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        functionName: pkg.functionName,
        status: 'failed',
        error: message,
        duration: Date.now() - startTime,
      };
    }
  }

  async remove(functionName: string | undefined, stage: string, region: string): Promise<void> {
    if (functionName) {
      const deployKey = `${functionName}:${stage}`;
      this.activeVersions.delete(deployKey);
      this.deployments.delete(deployKey);
      console.log(`  Removed: ${functionName} from ${stage}/${region}`);
    } else {
      // Remove all functions in stage
      for (const key of this.activeVersions.keys()) {
        if (key.endsWith(`:${stage}`)) {
          this.activeVersions.delete(key);
          this.deployments.delete(key);
        }
      }
      console.log(`  Removed all functions from ${stage}/${region}`);
    }
  }

  async rollback(functionName: string, stage: string, _region: string): Promise<DeployResult | null> {
    const deployKey = `${functionName}:${stage}`;
    const history = this.deployments.get(deployKey) ?? [];

    // Find the last active deployment that isn't the current one
    const currentVersion = this.activeVersions.get(deployKey);
    const previousDeployment = history
      .filter((d) => d.version !== currentVersion && d.status === 'active')
      .pop();

    if (!previousDeployment) {
      console.log(`  No previous version available for rollback`);
      return null;
    }

    // Mark current as rolled back
    const current = history.find((d) => d.version === currentVersion);
    if (current) current.status = 'rolled-back';

    // Switch to previous version
    this.activeVersions.set(deployKey, previousDeployment.version);

    console.log(`  Rolled back ${functionName} to ${previousDeployment.version}`);

    return {
      functionName,
      status: 'updated',
      version: previousDeployment.version,
    };
  }

  private async uploadPackage(_pkg: PackageResult): Promise<void> {
    // Simulate upload with slight delay
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async configureFunction(
    _pkg: PackageResult,
    _config: StageConfig,
    _version: string
  ): Promise<void> {
    // Simulate configuration
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  private async healthCheck(_functionName: string, _config: StageConfig): Promise<boolean> {
    // Simulate health check - always passes in dev
    await new Promise((resolve) => setTimeout(resolve, 20));
    return true;
  }

  private generateVersion(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `v${timestamp}-${random}`;
  }

  getDeploymentHistory(functionName: string, stage: string): DeploymentRecord[] {
    return this.deployments.get(`${functionName}:${stage}`) ?? [];
  }

  getActiveVersion(functionName: string, stage: string): string | undefined {
    return this.activeVersions.get(`${functionName}:${stage}`);
  }
}
