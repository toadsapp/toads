export default (sequelize, DataTypes) => {
  const chat_message = sequelize.define(
    'chat_message',
    {
      body: DataTypes.TEXT,
      identity_id: DataTypes.UUID,
      board: DataTypes.STRING,
      attachment_id: DataTypes.STRING,
    },
    {
      underscored: true,
    }
  )
  chat_message.associate = models => {
    models.identity.hasMany(chat_message, { foreignKey: 'identity_id' })
    chat_message.belongsTo(models.identity, { foreignKey: 'identity_id' })
    models.attachment.hasMany(chat_message, { foreignKey: 'attachment_id' })
    chat_message.belongsTo(models.attachment, { foreignKey: 'attachment_id' })

    chat_message.addScope(
      'defaultScope',
      {
        include: [
          {
            model: models.identity,
            attributes: ['id', 'name'],
          },
          {
            model: models.attachment,
            attributes: [
              'id',
              'type',
              'mimetype',
              'filename',
              'url',
              'metadata',
            ],
          },
        ],
      },
      { override: true }
    )
  }
  return chat_message
}