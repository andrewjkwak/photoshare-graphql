const fetch = require('node-fetch')
const { authorizeWithGithub } = require('../utils')

module.exports = {
  async githubAuth(parent, { code }, { db }) {
    // 1. Obtain data from GitHub
    let {
      message,
      access_token,
      avatar_url,
      login,
      name
    } = await authorizeWithGithub({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code
    })
    // 2. If there is a message, something went wrong
    if (message) {
      throw new Error(message)
    }
    // 3. Package the results into a single object
    let latestUserInfo = {
      name,
      githubLogin: login,
      githubToken: access_token,
      avatar: avatar_url
    }
    // 4. Add or update the record with new information
    const { ops: [user] } = await db
      .collection('users')
      .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true })
    // 5. Return user data and their token
    return { user, token: access_token }
  },

  async postPhoto(parent, args, { db, currentUser }) {
    // 1. If there is not a user in context, throw an error
    if (!currentUser) {
      throw new Error('only an authorized user can post a photo')
    }
    // 2. Save the current user's id with the photo
    const newPhoto = {
      ...args.input,
      userID: currentUser.githubLogin,
      created: new Date()
    }
    // 3. Insert the new photo, capture the id that the database created
    const { insertedIds } = await db.collection('photos').insert(newPhoto)
    newPhoto.id = insertedIds[0]

    return newPhoto
  },

  async addFakeUsers(parent, { count }, { db }) {
    const randomUserApi = `https://randomuser.me/api/?results=${ count }`
    const { results } = await fetch(randomUserApi)
      .then(res => res.json())
      .catch(err => console.log(err))
    
    const users = results.map(r => ({
      githubLogin: r.login.username,
      name: `${r.name.first} ${r.name.last}`,
      avatar: r.picture.thumbnail,
      githubToken: r.login.sha1
    }))

    await db.collection('users').insert(users)
    return users
  }, 

  async fakeUserAuth(parent, { githubLogin }, { db }) {
    const user = await db.collection('users').findOne({ githubLogin })

    if (!user) {
      throw new Error(`Cannot find user with githubLogin "${githubLogin}"`)
    }

    return {
      token: user.githubToken,
      user
    }
  }
}