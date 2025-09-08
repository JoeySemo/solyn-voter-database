const { dbUtils } = require('../lib/database');

// Sample voter data for testing
const sampleVoters = [
  {
    'Voter ID': 1001,
    'First Name': 'John',
    'Last Name': 'Smith',
    'Full Name': 'John Smith',
    'Full Address': '123 Main St, Wentzville, MO 63385',
    'Political Party': 'Democratic',
    'Birth Year': 1985,
    'Precinct': '001',
    'Split': 'A',
    'Ward': '1',
    'Township': 'Wentzville',
    'Voted in at least 1 of the last 5 municipal elections': 'Yes',
    'Voter History 1': '2024 General',
    'Voter History 2': '2023 Municipal',
    'Voter History 3': '2022 General',
    'Voter History 4': '2021 Municipal',
    'Voter History 5': '2020 General'
  },
  {
    'Voter ID': 1002,
    'First Name': 'Jane',
    'Last Name': 'Doe',
    'Full Name': 'Jane Doe',
    'Full Address': '456 Oak Ave, Wentzville, MO 63385',
    'Political Party': 'Republican',
    'Birth Year': 1990,
    'Precinct': '002',
    'Split': 'B',
    'Ward': '2',
    'Township': 'Wentzville',
    'Voted in at least 1 of the last 5 municipal elections': 'No',
    'Voter History 1': '2024 General',
    'Voter History 2': '2022 General',
    'Voter History 3': '2020 General',
    'Voter History 4': '',
    'Voter History 5': ''
  },
  {
    'Voter ID': 1003,
    'First Name': 'Bob',
    'Last Name': 'Johnson',
    'Full Name': 'Bob Johnson',
    'Full Address': '789 Pine St, Wentzville, MO 63385',
    'Political Party': 'Unaffiliated',
    'Birth Year': 1975,
    'Precinct': '003',
    'Split': 'A',
    'Ward': '3',
    'Township': 'Wentzville',
    'Voted in at least 1 of the last 5 municipal elections': 'Yes',
    'Voter History 1': '2024 General',
    'Voter History 2': '2023 Municipal',
    'Voter History 3': '2022 General',
    'Voter History 4': '2021 Municipal',
    'Voter History 5': '2020 General'
  },
  {
    'Voter ID': 1004,
    'First Name': 'Alice',
    'Last Name': 'Williams',
    'Full Name': 'Alice Williams',
    'Full Address': '321 Elm St, Wentzville, MO 63385',
    'Political Party': 'Democratic',
    'Birth Year': 1988,
    'Precinct': '001',
    'Split': 'B',
    'Ward': '1',
    'Township': 'Wentzville',
    'Voted in at least 1 of the last 5 municipal elections': 'Yes',
    'Voter History 1': '2024 General',
    'Voter History 2': '2023 Municipal',
    'Voter History 3': '2022 General',
    'Voter History 4': '2021 Municipal',
    'Voter History 5': '2020 General'
  },
  {
    'Voter ID': 1005,
    'First Name': 'Charlie',
    'Last Name': 'Brown',
    'Full Name': 'Charlie Brown',
    'Full Address': '654 Maple Dr, Wentzville, MO 63385',
    'Political Party': 'Republican',
    'Birth Year': 1992,
    'Precinct': '004',
    'Split': 'A',
    'Ward': '4',
    'Township': 'Wentzville',
    'Voted in at least 1 of the last 5 municipal elections': 'No',
    'Voter History 1': '2024 General',
    'Voter History 2': '2022 General',
    'Voter History 3': '',
    'Voter History 4': '',
    'Voter History 5': ''
  }
];

async function seedSampleData() {
  console.log('🌱 Seeding database with sample voter data...');
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing voter data...');
    dbUtils.clearVoters();
    
    // Insert sample data
    console.log('📝 Inserting sample voters...');
    sampleVoters.forEach(voter => {
      dbUtils.insertVoter(voter);
    });
    
    // Get stats
    const stats = dbUtils.getStats();
    
    console.log('✅ Sample data seeded successfully!');
    console.log(`📊 Total voters: ${stats.totalVoters}`);
    console.log(`🎯 Target voters: ${stats.targetVoters}`);
    console.log(`👥 Non-target voters: ${stats.nonTargetVoters}`);
    
    console.log('\n📋 Sample voters added:');
    sampleVoters.forEach(voter => {
      console.log(`  - ${voter['Full Name']} (ID: ${voter['Voter ID']}, Party: ${voter['Political Party']}, Target: ${voter['Voted in at least 1 of the last 5 municipal elections']})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleData();
}

module.exports = { seedSampleData };
