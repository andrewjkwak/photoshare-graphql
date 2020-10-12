module.exports = {
  Photo: {
    id: parent => parent.id || parent._id,
    url: parent => `/img/photos/${parent._id}.jpg`,
    postedBy: (parent, args, { db }) => 
      db.collection('users').findOne({ githubLogin: parent.userID })
  }
}