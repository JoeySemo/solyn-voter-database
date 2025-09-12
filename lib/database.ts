import Database from 'better-sqlite3';
import * as path from 'path';

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'voters.db');

// Ensure data directory exists
import * as fs from 'fs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys and optimize for performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 1000');
db.pragma('temp_store = MEMORY');

// Create voters table if it doesn't exist
const createVotersTable = `
  CREATE TABLE IF NOT EXISTS voters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "Voter ID" INTEGER UNIQUE NOT NULL,
    "First Name" TEXT,
    "Last Name" TEXT,
    "Full Name" TEXT,
    "Full Address" TEXT,
    "Political Party" TEXT,
    "Birth Year" INTEGER,
    "Precinct" TEXT,
    "Split" TEXT,
    "Ward" TEXT,
    "Township" TEXT,
    "Voted in at least 1 of the last 5 municipal elections" TEXT,
    "Voter History 1" TEXT,
    "Voter History 2" TEXT,
    "Voter History 3" TEXT,
    "Voter History 4" TEXT,
    "Voter History 5" TEXT,
    canvassed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

// Create indexes for better performance
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_voter_id ON voters("Voter ID")',
  'CREATE INDEX IF NOT EXISTS idx_full_name ON voters("Full Name")',
  'CREATE INDEX IF NOT EXISTS idx_address ON voters("Full Address")',
  'CREATE INDEX IF NOT EXISTS idx_party ON voters("Political Party")',
  'CREATE INDEX IF NOT EXISTS idx_precinct ON voters("Precinct")',
  'CREATE INDEX IF NOT EXISTS idx_ward ON voters("Ward")',
  'CREATE INDEX IF NOT EXISTS idx_township ON voters("Township")',
  'CREATE INDEX IF NOT EXISTS idx_target_voter ON voters("Voted in at least 1 of the last 5 municipal elections")',
  'CREATE INDEX IF NOT EXISTS idx_birth_year ON voters("Birth Year")',
  'CREATE INDEX IF NOT EXISTS idx_canvassed ON voters(canvassed)'
];

// Initialize database
try {
  db.exec(createVotersTable);
  createIndexes.forEach(index => db.exec(index));
  console.log('✅ SQLite database initialized successfully');
} catch (error) {
  console.error('❌ Error initializing database:', error);
}

// Prepared statements for better performance
const preparedStatements = {
  // Get voters with pagination and filters
  getVoters: db.prepare(`
    SELECT * FROM voters 
    ORDER BY "Voter ID" 
    LIMIT ? OFFSET ?
  `),
  
  // Count total voters
  countVoters: db.prepare(`
    SELECT COUNT(*) as count FROM voters
  `),
  
  // Get filter options
  getPrecincts: db.prepare('SELECT DISTINCT "Precinct" FROM voters WHERE "Precinct" IS NOT NULL AND "Precinct" != \'\' ORDER BY "Precinct"'),
  getSplits: db.prepare('SELECT DISTINCT "Split" FROM voters WHERE "Split" IS NOT NULL AND "Split" != \'\' ORDER BY "Split"'),
  getWards: db.prepare('SELECT DISTINCT "Ward" FROM voters WHERE "Ward" IS NOT NULL AND "Ward" != \'\' ORDER BY "Ward"'),
  getTownships: db.prepare('SELECT DISTINCT "Township" FROM voters WHERE "Township" IS NOT NULL AND "Township" != \'\' ORDER BY "Township"'),
  getParties: db.prepare('SELECT DISTINCT "Political Party" FROM voters WHERE "Political Party" IS NOT NULL AND "Political Party" != \'\' ORDER BY "Political Party"'),
  
  // Insert voter
  insertVoter: db.prepare(`
    INSERT OR REPLACE INTO voters (
      "Voter ID", "First Name", "Last Name", "Full Name", "Full Address", 
      "Political Party", "Birth Year", "Precinct", "Split", "Ward", "Township",
      "Voted in at least 1 of the last 5 municipal elections",
      "Voter History 1", "Voter History 2", "Voter History 3", "Voter History 4", "Voter History 5"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  // Get voter by ID
  getVoterById: db.prepare('SELECT * FROM voters WHERE "Voter ID" = ?'),
  
  // Update voter
  updateVoter: db.prepare(`
    UPDATE voters SET 
      "First Name" = ?, "Last Name" = ?, "Full Name" = ?, "Full Address" = ?,
      "Political Party" = ?, "Birth Year" = ?, "Precinct" = ?, "Split" = ?, 
      "Ward" = ?, "Township" = ?, "Voted in at least 1 of the last 5 municipal elections" = ?,
      "Voter History 1" = ?, "Voter History 2" = ?, "Voter History 3" = ?, 
      "Voter History 4" = ?, "Voter History 5" = ?, updated_at = CURRENT_TIMESTAMP
    WHERE "Voter ID" = ?
  `),
  
  // Delete voter
  deleteVoter: db.prepare('DELETE FROM voters WHERE "Voter ID" = ?'),
  
  // Update canvassed status
  updateCanvassedStatus: db.prepare('UPDATE voters SET canvassed = ?, updated_at = CURRENT_TIMESTAMP WHERE "Voter ID" = ?'),
  
  // Clear all voters
  clearVoters: db.prepare('DELETE FROM voters')
};

// Database utility functions
const dbUtils = {
  // Get voters with filters and pagination
  getVoters: (params) => {
    const { page, pageSize, search, precinct, split, ward, township, targetVoter, party, canvassed } = params;
    const offset = (page - 1) * pageSize;
    
    // Build WHERE clause dynamically
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    // Search filter
    if (search) {
      const searchAsNumber = parseInt(search);
      if (!isNaN(searchAsNumber)) {
        whereClause += ' AND "Voter ID" = ?';
        queryParams.push(searchAsNumber);
      } else {
        const searchTerms = search.split(' ').filter(term => term.length > 0);
        if (searchTerms.length > 1) {
          whereClause += ' AND "First Name" LIKE ? AND "Last Name" LIKE ?';
          queryParams.push(`%${searchTerms[0]}%`, `%${searchTerms[1]}%`);
        } else {
          whereClause += ' AND ("Full Name" LIKE ? OR "Full Address" LIKE ? OR "Political Party" LIKE ?)';
          queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
      }
    }
    
    // Other filters
    if (precinct && precinct !== 'all') {
      whereClause += ' AND "Precinct" = ?';
      queryParams.push(precinct);
    }
    
    if (split && split !== 'all') {
      whereClause += ' AND "Split" = ?';
      queryParams.push(split);
    }
    
    if (ward && ward !== 'all') {
      whereClause += ' AND "Ward" = ?';
      queryParams.push(ward);
    }
    
    if (township && township !== 'all') {
      whereClause += ' AND "Township" = ?';
      queryParams.push(township);
    }
    
    if (targetVoter === 'true') {
      whereClause += ' AND "Voted in at least 1 of the last 5 municipal elections" = ?';
      queryParams.push('Yes');
    } else if (targetVoter === 'false') {
      whereClause += ' AND "Voted in at least 1 of the last 5 municipal elections" = ?';
      queryParams.push('No');
    }
    
    if (party && party !== 'all') {
      whereClause += ' AND "Political Party" = ?';
      queryParams.push(party);
    }
    
    if (canvassed === 'true') {
      whereClause += ' AND canvassed = 1';
    } else if (canvassed === 'false') {
      whereClause += ' AND canvassed = 0';
    }
    
    // Get count
    const countQuery = `SELECT COUNT(*) as count FROM voters ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...queryParams);
    const totalVoters = countResult.count;
    
    // Get data
    const dataQuery = `SELECT * FROM voters ${whereClause} ORDER BY "Voter ID" LIMIT ? OFFSET ?`;
    const dataStmt = db.prepare(dataQuery);
    const voters = dataStmt.all(...queryParams, pageSize, offset);
    
    return {
      voters,
      totalVoters,
      totalPages: Math.ceil(totalVoters / pageSize)
    };
  },
  
  // Get filter options
  getFilters: () => {
    return {
      precincts: preparedStatements.getPrecincts.all().map(row => row['Precinct']),
      splits: preparedStatements.getSplits.all().map(row => row['Split']),
      wards: preparedStatements.getWards.all().map(row => row['Ward']),
      townships: preparedStatements.getTownships.all().map(row => row['Township']),
      parties: preparedStatements.getParties.all().map(row => row['Political Party'])
    };
  },
  
  // Insert voter
  insertVoter: (voter) => {
    return preparedStatements.insertVoter.run(
      voter['Voter ID'],
      voter['First Name'],
      voter['Last Name'],
      voter['Full Name'],
      voter['Full Address'],
      voter['Political Party'],
      voter['Birth Year'],
      voter['Precinct'],
      voter['Split'],
      voter['Ward'],
      voter['Township'],
      voter['Voted in at least 1 of the last 5 municipal elections'],
      voter['Voter History 1'],
      voter['Voter History 2'],
      voter['Voter History 3'],
      voter['Voter History 4'],
      voter['Voter History 5']
    );
  },
  
  // Get voter by ID
  getVoterById: (id) => {
    return preparedStatements.getVoterById.get(id);
  },
  
  // Update canvassed status
  updateCanvassedStatus: (voterId, canvassed) => {
    return preparedStatements.updateCanvassedStatus.run(canvassed ? 1 : 0, voterId);
  },
  
  // Clear all voters
  clearVoters: () => {
    return preparedStatements.clearVoters.run();
  },
  
  // Get database stats
  getStats: () => {
    const totalVoters = db.prepare('SELECT COUNT(*) as count FROM voters').get();
    const targetVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE "Voted in at least 1 of the last 5 municipal elections" = ?').get('Yes');
    
    return {
      totalVoters: totalVoters.count,
      targetVoters: targetVoters.count,
      nonTargetVoters: totalVoters.count - targetVoters.count
    };
  }
};

export { dbUtils };
export default db;
