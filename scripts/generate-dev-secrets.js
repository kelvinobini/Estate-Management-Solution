#!/usr/bin/env node
/**
 * Generates a throwaway RS256 keypair + MFA encryption key for local
 * development and writes them into apps/api/.env (copied from .env.example
 * if it doesn't exist yet). Never use this for anything beyond a local dev
 * environment — for staging/production, generate real secrets out-of-band
 * and inject them via your platform's secret manager, never commit them.
 *
 * Run with: node scripts/generate-dev-secrets.js
 */
const fs = require('fs');
const path = require('path');
const { generateKeyPairSync, randomBytes } = require('crypto');

const apiDir = path.join(__dirname, '..', 'apps', 'api');
const envPath = path.join(apiDir, '.env');
const envExamplePath = path.join(apiDir, '.env.example');

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log(`Created ${envPath} from .env.example`);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Stored as a single line with literal \n escapes — see src/common/pem.util.ts for the read-side unescaping.
const escapedPrivateKey = privateKey.trim().replace(/\n/g, '\\n');
const escapedPublicKey = publicKey.trim().replace(/\n/g, '\\n');
const mfaEncryptionKey = randomBytes(32).toString('hex');

let env = fs.readFileSync(envPath, 'utf8');
env = setEnvVar(env, 'JWT_PRIVATE_KEY', escapedPrivateKey);
env = setEnvVar(env, 'JWT_PUBLIC_KEY', escapedPublicKey);
env = setEnvVar(env, 'MFA_ENCRYPTION_KEY', mfaEncryptionKey);
fs.writeFileSync(envPath, env);

console.log('Generated JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, and MFA_ENCRYPTION_KEY into apps/api/.env');

function setEnvVar(envContent, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(envContent) ? envContent.replace(pattern, line) : `${envContent}\n${line}`;
}
