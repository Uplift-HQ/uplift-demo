const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch monorepo packages folder (not the root which causes issues)
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages'),
];

// Node modules resolution for monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure Metro knows this is the project root
config.projectRoot = projectRoot;

// Disable the new cache system that may cause issues
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
