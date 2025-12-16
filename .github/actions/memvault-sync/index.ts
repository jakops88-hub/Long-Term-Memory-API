import * as core from '@actions/core';
import * as github from '@actions/github';
import { create } from '@actions/glob';
import fetch from 'node-fetch';
import fs from 'fs/promises';

async function run() {
  try {
    // Inputs
    const apiKey = core.getInput('memvault_api_key', { required: true });
    const vaultId = core.getInput('vault_id');
    const filePaths = core.getInput('file_paths') || '**/*.md';

    // Security: Mask API key in logs
    core.setSecret(apiKey);

    // Context
    const { repo, ref, sha } = github.context;
    const repoName = repo.repo;
    const owner = repo.owner;
    const branch = ref.replace('refs/heads/', '');
    const commit = sha;

    core.info(`Scanning files: ${filePaths}`);
    const globber = await create(filePaths);
    const files = await globber.glob();
    if (files.length === 0) {
      core.warning('No files matched the provided pattern.');
      return;
    }
    core.info(`Found ${files.length} files to sync.`);

    // Read file contents
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        path: file,
        content: await fs.readFile(file, 'utf8'),
      }))
    );

    // Prepare payload
    const payload = {
      vaultId: vaultId || undefined,
      repo: {
        owner,
        name: repoName,
        branch,
        commit,
      },
      files: fileContents,
    };

    core.info('Syncing to MemVault...');
    const response = await fetch('https://moderate-krystal-memvault-af80fe26.koyeb.app/api/memory/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let explanation = `MemVault API error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) explanation += ` - ${errJson.error}`;
      } catch {}
      core.setFailed(explanation);
      return;
    }

    const result = await response.json();
    core.info('Sync successful. MemVault response:');
    core.info(JSON.stringify(result));
  } catch (error: any) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
