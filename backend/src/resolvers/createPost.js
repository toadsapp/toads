import moment from 'moment'
import { isObject, isString, isNumber } from 'lodash'
import Models from '../models'
import * as Utils from '../utils'

export const validatePost = async (
  { id, identity },
  { parent_id, body, attachment_id }
) => {
  let foundParent
  // verify that we can reply to the parent
  if (parent_id !== undefined) {
    foundParent = await Models[id].findOne({
      where: {
        id: parent_id,
        parent: null,
      },
    })
    if (!foundParent) {
      return null
    }
  }

  if (isString(attachment_id) || isNumber(attachment_id)) {
    const attachment = await Models.attachment.findOne({
      where: {
        id: attachment_id,
      },
    })
    if (!attachment) {
      return null
    }

    // generate metadata
    const dim = await Utils.imageDimensions(attachment.url)
    if (!dim) {
      return null
    }

    attachment.metadata = dim
    attachment.metadata.size = dim.length
    delete attachment.metadata.length
    await attachment.save()
  }

  const post = {
    parent: parent_id,
    attachment_id,
    body,
    identity_id: identity.id,
  }

  return { post, foundParent }
}

export default async (_, args, ctx) => {
  const { id } = _
  const validation = await validatePost(_, args, ctx)

  if (!isObject(validation)) {
    return null
  }

  const { post, foundParent } = validation
  if (foundParent === undefined && post.attachment_id === undefined) {
    return null // Don't allow OPs without attachment
  }

  if (foundParent && moment(foundParent.expires_at).isBefore()) {
    return null // Don't allow replies to expired posts
  }

  if (post.parent_id === undefined) {
    post.expires_at = Utils.expiry()
    post.bumped_at = new Date()
  }

  const newPost = await Models[id].create(post)

  const postWithData = await Models[id].findOne({
    where: { id: newPost.id },
  })

  // bump op if we're replying
  if (foundParent) {
    foundParent.bumped_at = new Date()
    foundParent.save()
  }

  return postWithData
}
