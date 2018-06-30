module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('conversation_messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      identity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'identities',
          key: 'id',
        },
      },
      attachment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'attachments',
          key: 'id',
        },
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }),
  down: (queryInterface, Sequelize) =>
    queryInterface.dropTable('conversation_messages'),
}
