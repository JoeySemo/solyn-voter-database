const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { dbUtils } = require('../lib/database');

/**
 * Import WSD VoterList data from CSV file
 * Usage: node scripts/import-voters.js <path-to-csv-file>
 */

async function importVoters(csvFilePath) {
  console.log('🚀 Starting voter data import...');
  console.log(`📁 Reading from: ${csvFilePath}`);
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('❌ CSV file not found:', csvFilePath);
    process.exit(1);
  }
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing voter data...');
    dbUtils.clearVoters();
    
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Read and process CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Clean and validate the data
            const cleanedRow = cleanVoterData(row);
            
            if (cleanedRow) {
              dbUtils.insertVoter(cleanedRow);
              importedCount++;
              
              if (importedCount % 1000 === 0) {
                console.log(`📊 Imported ${importedCount} voters...`);
              }
            }
          } catch (error) {
            errorCount++;
            errors.push({
              row: row,
              error: error.message
            });
            
            if (errorCount % 100 === 0) {
              console.log(`⚠️  ${errorCount} errors encountered...`);
            }
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // Get final stats
    const stats = dbUtils.getStats();
    
    console.log('\n✅ Import completed!');
    console.log(`📊 Total voters imported: ${importedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`🎯 Target voters: ${stats.targetVoters}`);
    console.log(`👥 Non-target voters: ${stats.nonTargetVoters}`);
    console.log(`📈 Total in database: ${stats.totalVoters}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Sample errors:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.error}`);
      });
      
      if (errors.length > 5) {
        console.log(`... and ${errors.length - 5} more errors`);
      }
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

/**
 * Clean and validate voter data
 */
function cleanVoterData(row) {
  // Skip empty rows
  if (!row || Object.keys(row).length === 0) {
    return null;
  }
  
  // Extract and clean data
  const voterId = parseInt(row['Voter ID'] || row['VoterID'] || row['ID']);
  if (!voterId || isNaN(voterId)) {
    return null; // Skip rows without valid Voter ID
  }
  
  const firstName = cleanText(row['First Name'] || row['FirstName'] || row['First']);
  const lastName = cleanText(row['Last Name'] || row['LastName'] || row['Last']);
  const fullName = cleanText(row['Full Name'] || row['FullName'] || `${firstName} ${lastName}`.trim());
  
  if (!fullName || fullName.length < 2) {
    return null; // Skip rows without valid name
  }
  
  const fullAddress = cleanText(row['Full Address'] || row['Address'] || row['FullAddress']);
  const politicalParty = cleanText(row['Political Party'] || row['Party'] || row['PoliticalParty']);
  const birthYear = parseInt(row['Birth Year'] || row['BirthYear'] || row['Birth']);
  
  const precinct = cleanText(row['Precinct']);
  const split = cleanText(row['Split']);
  const ward = cleanText(row['Ward']);
  const township = cleanText(row['Township']);
  
  // Target voter status
  const targetVoter = cleanText(row['Voted in at least 1 of the last 5 municipal elections'] || 
                                row['Target Voter'] || 
                                row['Municipal Voter'] ||
                                row['TargetVoter']);
  
  // Voting history
  const voterHistory1 = cleanText(row['Voter History 1'] || row['Vote History 1'] || row['History1']);
  const voterHistory2 = cleanText(row['Voter History 2'] || row['Vote History 2'] || row['History2']);
  const voterHistory3 = cleanText(row['Voter History 3'] || row['Vote History 3'] || row['History3']);
  const voterHistory4 = cleanText(row['Voter History 4'] || row['Vote History 4'] || row['History4']);
  const voterHistory5 = cleanText(row['Voter History 5'] || row['Vote History 5'] || row['History5']);
  
  return {
    'Voter ID': voterId,
    'First Name': firstName,
    'Last Name': lastName,
    'Full Name': fullName,
    'Full Address': fullAddress,
    'Political Party': politicalParty,
    'Birth Year': birthYear,
    'Precinct': precinct,
    'Split': split,
    'Ward': ward,
    'Township': township,
    'Voted in at least 1 of the last 5 municipal elections': targetVoter,
    'Voter History 1': voterHistory1,
    'Voter History 2': voterHistory2,
    'Voter History 3': voterHistory3,
    'Voter History 4': voterHistory4,
    'Voter History 5': voterHistory5
  };
}

/**
 * Clean text data
 */
function cleanText(text) {
  if (!text) return null;
  
  // Convert to string and trim
  let cleaned = String(text).trim();
  
  // Handle common variations
  if (cleaned === '' || cleaned === 'null' || cleaned === 'undefined') {
    return null;
  }
  
  // Normalize party names
  if (cleaned.toLowerCase() === 'unaffiliated' || cleaned === '' || cleaned === ' ') {
    return 'Unaffiliated';
  }
  
  return cleaned;
}

// Main execution
if (require.main === module) {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.log('Usage: node scripts/import-voters.js <path-to-csv-file>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/import-voters.js ./data/wsd-voterlist.csv');
    console.log('');
    console.log('Supported CSV columns:');
    console.log('  - Voter ID, VoterID, ID');
    console.log('  - First Name, FirstName, First');
    console.log('  - Last Name, LastName, Last');
    console.log('  - Full Name, FullName');
    console.log('  - Full Address, Address, FullAddress');
    console.log('  - Political Party, Party, PoliticalParty');
    console.log('  - Birth Year, BirthYear, Birth');
    console.log('  - Precinct, Split, Ward, Township');
    console.log('  - Voted in at least 1 of the last 5 municipal elections, Target Voter, Municipal Voter');
    console.log('  - Voter History 1-5, Vote History 1-5, History1-5');
    process.exit(1);
  }
  
  importVoters(csvFilePath).catch(console.error);
}

module.exports = { importVoters, cleanVoterData };
