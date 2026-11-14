const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList;
const workspaceRoot = path.resolve(__dirname, '../..');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Metro watches the monorepo. Recovery files and independent validation copies
// are not app sources; their writes must not invalidate the live preview.
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  ...['generated-artifacts', '.local'].map(directory =>
    new RegExp(`^${escapePattern(path.join(workspaceRoot, directory))}(?:[/\\\\]|$)`),
  ),
];

module.exports = config;
