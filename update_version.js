const fs = require('fs');
const path = require('path');

// Get the version from command-line arguments
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Please provide a version as an argument.');
  process.exit(1);
}

// Root directory containing all npm projects
const rootDir = __dirname;

// Function to update package.json
function updatePackageJson(filePath, newVersion, dirname) {
  const packageJsonPath = path.join(filePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.warn(`No package.json found in ${filePath}`);
    return;
  }

  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Update the "version" field
  if (packageJson.version) {
    console.log(`Updating version in ${filePath} to ${newVersion}`);
    packageJson.version = newVersion;
  }

  // skip commons
  if (dirname == 'testit-js-commons') {
    console.log('Only version updates for commons')
  }
  // Update the "commons" dependency version
  else if (packageJson.dependencies && packageJson.dependencies['testit-js-commons']) {
    console.log(`Updating "commons" dependency in ${filePath} to ${newVersion}`);
    packageJson.dependencies['testit-js-commons'] = newVersion;
  }

  // Write the updated package.json back to the file
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

// Traverse all subdirectories in the root folder
fs.readdirSync(rootDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory()) // Only process directories
  .forEach(dir => {
    const projectPath = path.join(rootDir, dir.name);
    updatePackageJson(projectPath, newVersion, dir.name);
  });

console.log('All versions updated successfully.');