const fs = require('fs');

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync('../package.json'));

// Append "-dev" suffix to the package name
packageJson.name += '-dev';

// Update the package.json file with the modified name
fs.writeFileSync('../package.json', JSON.stringify(packageJson, null, 2));

// Run "npm link" command
const { exec } = require('child_process');
exec('npm link', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log('Package linked successfully!');
});
