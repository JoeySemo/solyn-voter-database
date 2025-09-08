const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Convert Excel file to CSV
 * Usage: node scripts/convert-excel-to-csv.js <path-to-excel-file>
 */

function convertExcelToCsv(excelFilePath) {
  console.log('🔄 Converting Excel file to CSV...');
  console.log(`📁 Reading from: ${excelFilePath}`);
  
  if (!fs.existsSync(excelFilePath)) {
    console.error('❌ Excel file not found:', excelFilePath);
    process.exit(1);
  }
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    console.log(`📊 Found sheet: ${sheetName}`);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to CSV
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    // Create output filename
    const outputPath = excelFilePath.replace(/\.xlsx?$/i, '.csv');
    
    // Write CSV file
    fs.writeFileSync(outputPath, csvData, 'utf8');
    
    console.log('✅ Conversion completed!');
    console.log(`📄 CSV file created: ${outputPath}`);
    
    // Show first few lines to verify
    const lines = csvData.split('\n');
    console.log(`📊 Total rows: ${lines.length}`);
    console.log('\n📋 First few lines:');
    lines.slice(0, 3).forEach((line, index) => {
      console.log(`${index + 1}. ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const excelFilePath = process.argv[2];
  
  if (!excelFilePath) {
    console.log('Usage: node scripts/convert-excel-to-csv.js <path-to-excel-file>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/convert-excel-to-csv.js ~/Downloads/WSD\\ VoterList\\ 2025.04.24.xlsx');
    process.exit(1);
  }
  
  convertExcelToCsv(excelFilePath);
}

module.exports = { convertExcelToCsv };
