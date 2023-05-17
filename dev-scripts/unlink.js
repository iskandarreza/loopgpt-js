const fs = require('fs');

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync('../package.json'));

// Remove the "-dev" suffix from the package name
packageJson.name = packageJson.name.replace('-dev', '');

// Update the package.json file with the modified name
fs.writeFileSync('../package.json', JSON.stringify(packageJson, null, 2));

// Run "npm unlink" command
const { exec } = require('child_process');
exec('npm unlink', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log('Package unlinked successfully!');
});