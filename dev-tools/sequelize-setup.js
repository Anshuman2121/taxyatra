// Development-only Sequelize setup for migrations and table creation
// Run: node dev-tools/sequelize-setup.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../dev-database.db'),
  logging: console.log
});

// Define Registration model
const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  activation_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_activated: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'registration',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

async function setupDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');
    
    await sequelize.sync({ force: true });
    console.log('Database synced successfully.');
    
    // Create sample data
    await Registration.create({
      activation_code: '12345678',
      is_activated: true
    });
    
    console.log('Sample data created.');
    
    await sequelize.close();
    console.log('Setup complete!');
  } catch (error) {
    console.error('Unable to setup database:', error);
  }
}

setupDatabase();
