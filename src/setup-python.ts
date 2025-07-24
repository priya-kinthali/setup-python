import * as core from '@actions/core';
import * as finder from './find-python';
import * as finderPyPy from './find-pypy';
import * as finderGraalPy from './find-graalpy';
import * as path from 'path';
import * as os from 'os';
import fs from 'fs';
import {getCacheDistributor} from './cache-distributions/cache-factory';
import {
  isCacheFeatureAvailable,
  logWarning,
  IS_MAC,
  getVersionInputFromFile,
  getVersionInputFromPlainFile
} from './utils';

function isPyPyVersion(versionSpec: string) {
  return versionSpec.startsWith('pypy');
}

function isGraalPyVersion(versionSpec: string) {
  return versionSpec.startsWith('graalpy');
}

async function cacheDependencies(cache: string, pythonVersion: string) {
  let cacheDependencyPath = core.getInput('cache-dependency-path') || undefined;
  if (cacheDependencyPath) {
    // Get the GITHUB_WORKSPACE directory or fallback to process.cwd()
    core.info(`Initial cacheDependencyPath: ${cacheDependencyPath}`);
    const githubWorkspace = process.env['GITHUB_WORKSPACE'] || process.cwd();
    core.info(`GITHUB_WORKSPACE: ${githubWorkspace}`);
    const actionPath = process.env.GITHUB_ACTION_PATH || '';
    core.info(`Action Path: ${actionPath}`);
    // Resolve the absolute path of the input file
    const resolvedPath = path.resolve(cacheDependencyPath);
    core.info(`Resolved absolute path of cacheDependencyPath: ${resolvedPath}`);
    // Check if the file is within the GITHUB_WORKSPACE
    if (!resolvedPath.startsWith(githubWorkspace)) {
      core.info('Resolved path is outside of GITHUB_WORKSPACE.');
      // Create a temporary directory within the GITHUB_WORKSPACE
      const filePaths = resolvedPath
        .split('\n')
        .map(filePath => filePath.trim());
      core.info(`File paths to be processed: ${JSON.stringify(filePaths)}`); // Log the filePaths array
      const tempDir = fs.mkdtempSync(
        path.join(githubWorkspace, 'setup-python-')
      );
      core.info(`Temporary directory created: ${tempDir}`);
      const traverseDir = (dir: string, pattern: string): string[] => {
        core.info(`Traversing directory: ${dir}`);
        const matchedFiles: string[] = [];

        const entries = fs.readdirSync(dir, {withFileTypes: true});
        core.info(
          `Entries found in directory: ${entries.map(entry => entry.name).join(', ')}`
        );

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          core.info(`Processing entry: ${entry.name}, Full path: ${fullPath}`);

          if (entry.isDirectory()) {
            core.info(`Entry is a directory: ${entry.name}`);
            // Recursively traverse subdirectories
            matchedFiles.push(...traverseDir(fullPath, pattern));
          } else if (entry.name.match(new RegExp(pattern.replace('*', '.*')))) {
            core.info(`File matches pattern: ${entry.name}`);
            matchedFiles.push(fullPath);
          } else {
            core.info(`File does not match pattern: ${entry.name}`);
          }
        }

        return matchedFiles;
      };

      const tempFilePaths = filePaths
        .flatMap(filePath => {
          core.info(`File Path: ${filePath}`);

          let resolvedPaths: string[] = [];
          if (filePath.includes('*')) {
            core.info(`Wildcard pattern detected in filePath: ${filePath}`);

            // Resolve the base directory by removing the wildcard part
            const baseDir = filePath.startsWith('**')
              ? process.cwd()
              : path.dirname(filePath.replace(/\*\*\/?/, ''));
            core.info(`Base directory resolved to: ${baseDir}`);

            const pattern = path.basename(filePath).replace('*', '.*');
            core.info(`Pattern to match: ${pattern}`);

            // Traverse the directory recursively to find matching files
            resolvedPaths = traverseDir(baseDir, pattern);
          } else {
            core.info(
              `No wildcard pattern detected. Resolving single file path: ${filePath}`
            );
            resolvedPaths = [path.resolve(filePath)];
            core.info(`Resolved file path: ${resolvedPaths[0]}`);
          }

          return resolvedPaths;
        })
        .map(resolvedFilePath => {
          core.info(`Resolved File Path: ${resolvedFilePath}`);

          // Extract the part of resolvedPath excluding actionPath
          const relativePath = resolvedFilePath.startsWith(actionPath)
            ? resolvedFilePath.slice(actionPath.length + 1) // +1 to remove the trailing slash
            : resolvedFilePath;
          core.info(`Relative Path (excluding actionPath): ${relativePath}`);

          // Append the relative path to tempDir
          const updatedPath = path.join(tempDir, relativePath);
          core.info(`Updated Path: ${updatedPath}`);

          // Ensure destination directory exists
          fs.mkdirSync(path.dirname(updatedPath), {recursive: true});

          // Copy the file to the updated path
          fs.copyFileSync(resolvedFilePath, updatedPath);
          core.info(`Copied: ${resolvedFilePath} -> ${updatedPath}`);

          // Read and log the contents of the copied file
          const fileContents = fs.readFileSync(updatedPath, 'utf8');
          core.info(`Contents of ${updatedPath}:\n${fileContents}`);

          return updatedPath;
        });

      core.info(`Final tempFilePaths: ${JSON.stringify(tempFilePaths)}`);
      cacheDependencyPath = tempFilePaths.join('\n');
      core.info(`Updated cacheDependencyPath: ${cacheDependencyPath}`);
    }
  }
  const cacheDistributor = getCacheDistributor(
    cache,
    pythonVersion,
    cacheDependencyPath
  );
  await cacheDistributor.restoreCache();
}

function resolveVersionInputFromDefaultFile(): string[] {
  const couples: [string, (versionFile: string) => string[]][] = [
    ['.python-version', getVersionInputFromPlainFile]
  ];
  for (const [versionFile, _fn] of couples) {
    logWarning(
      `Neither 'python-version' nor 'python-version-file' inputs were supplied. Attempting to find '${versionFile}' file.`
    );
    if (fs.existsSync(versionFile)) {
      return _fn(versionFile);
    } else {
      logWarning(`${versionFile} doesn't exist.`);
    }
  }
  return [];
}

function resolveVersionInput() {
  let versions = core.getMultilineInput('python-version');
  const versionFile = core.getInput('python-version-file');

  if (versions.length) {
    if (versionFile) {
      core.warning(
        'Both python-version and python-version-file inputs are specified, only python-version will be used.'
      );
    }
  } else {
    if (versionFile) {
      if (!fs.existsSync(versionFile)) {
        throw new Error(
          `The specified python version file at: ${versionFile} doesn't exist.`
        );
      }
      versions = getVersionInputFromFile(versionFile);
    } else {
      versions = resolveVersionInputFromDefaultFile();
    }
  }

  return versions;
}

async function run() {
  if (IS_MAC) {
    process.env['AGENT_TOOLSDIRECTORY'] = '/Users/runner/hostedtoolcache';
  }

  if (process.env.AGENT_TOOLSDIRECTORY?.trim()) {
    process.env['RUNNER_TOOL_CACHE'] = process.env['AGENT_TOOLSDIRECTORY'];
  }

  core.debug(
    `Python is expected to be installed into ${process.env['RUNNER_TOOL_CACHE']}`
  );
  try {
    const versions = resolveVersionInput();
    const checkLatest = core.getBooleanInput('check-latest');
    const allowPreReleases = core.getBooleanInput('allow-prereleases');
    const freethreaded = core.getBooleanInput('freethreaded');

    if (versions.length) {
      let pythonVersion = '';
      const arch: string = core.getInput('architecture') || os.arch();
      const updateEnvironment = core.getBooleanInput('update-environment');
      core.startGroup('Installed versions');
      for (const version of versions) {
        if (isPyPyVersion(version)) {
          const installed = await finderPyPy.findPyPyVersion(
            version,
            arch,
            updateEnvironment,
            checkLatest,
            allowPreReleases
          );
          pythonVersion = `${installed.resolvedPyPyVersion}-${installed.resolvedPythonVersion}`;
          core.info(
            `Successfully set up PyPy ${installed.resolvedPyPyVersion} with Python (${installed.resolvedPythonVersion})`
          );
        } else if (isGraalPyVersion(version)) {
          const installed = await finderGraalPy.findGraalPyVersion(
            version,
            arch,
            updateEnvironment,
            checkLatest,
            allowPreReleases
          );
          pythonVersion = `${installed}`;
          core.info(`Successfully set up GraalPy ${installed}`);
        } else {
          if (version.startsWith('2')) {
            core.warning(
              'The support for python 2.7 was removed on June 19, 2023. Related issue: https://github.com/actions/setup-python/issues/672'
            );
          }
          const installed = await finder.useCpythonVersion(
            version,
            arch,
            updateEnvironment,
            checkLatest,
            allowPreReleases,
            freethreaded
          );
          pythonVersion = installed.version;
          core.info(`Successfully set up ${installed.impl} (${pythonVersion})`);
        }
      }
      core.endGroup();
      const cache = core.getInput('cache');
      if (cache && isCacheFeatureAvailable()) {
        await cacheDependencies(cache, pythonVersion);
      }
    } else {
      core.warning(
        'The `python-version` input is not set.  The version of Python currently in `PATH` will be used.'
      );
    }
    const matchersPath = path.join(__dirname, '../..', '.github');
    core.info(`##[add-matcher]${path.join(matchersPath, 'python.json')}`);
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
