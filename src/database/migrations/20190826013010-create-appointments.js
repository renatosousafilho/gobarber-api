

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('appointments', { 
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      date: {
        alllowNull: false,
        type: Sequelize.DATE
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', foreign_key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      provider_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id'},
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true, 
      },
      canceled_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        alllowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        alllowNull: false,
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable('appointments');
  }
};
