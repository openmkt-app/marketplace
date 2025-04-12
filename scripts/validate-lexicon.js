const fs = require('fs');
const path = require('path');
const { Lexicons } = require('@atproto/lexicon');

// Path to your lexicon files
const lexiconDir = path.join(__dirname, '..', 'lexicons');

// Function to validate a lexicon file
function validateLexicon(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lexiconDoc = JSON.parse(content);
    
    // Create a new Lexicons instance
    const lexicons = new Lexicons();
    
    // Add the lexicon document to the collection
    lexicons.add(lexiconDoc);
    
    console.log(`✅ Valid lexicon: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Invalid lexicon: ${filePath}`);
    console.error(error);
    return false;
  }
}

// Recursively walk directories to find all lexicon files
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively walk through directories
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.json')) {
      // Add JSON files to results
      results.push(filePath);
    }
  });
  
  return results;
}

// Find and validate all lexicon files
function validateAllLexicons() {
  if (!fs.existsSync(lexiconDir)) {
    console.error(`Directory not found: ${lexiconDir}`);
    process.exit(1);
  }
  
  const lexiconFiles = walkDir(lexiconDir);
  
  if (lexiconFiles.length === 0) {
    console.log('No lexicon files found.');
    return;
  }
  
  let validCount = 0;
  
  for (const file of lexiconFiles) {
    if (validateLexicon(file)) {
      validCount++;
    }
  }
  
  console.log(`\nValidation complete: ${validCount}/${lexiconFiles.length} lexicons are valid.`);
  
  // Exit with error code if any lexicons are invalid
  if (validCount < lexiconFiles.length) {
    process.exit(1);
  }
}

validateAllLexicons();