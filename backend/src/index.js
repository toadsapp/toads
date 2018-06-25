import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import NoIntrospection from 'graphql-disable-introspection'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import depthLimit from 'graphql-depth-limit'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { execute, subscribe } from 'graphql'
import sessionMiddleware from './session'
import auth, { wsAuth } from './auth'
import schema from './schema'
import config from './config'

const PORT = config('port')

const app = express()
console.log(`toad-backend ${GIT_COMMIT}`)
console.log(`listening on :${PORT}`)

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1.xip.io',
    'https://toads.app',
  ],
  credentials: true,
}

app.options('*', cors(corsOptions))
app.use(cors(corsOptions))
app.use(logger('dev'))
app.use(cookieParser())

app.post('/session', sessionMiddleware)
app.use('/graphql', auth)
app.use('/healthz', (req, res) => res.json({ error: false }))

const production = process.env.NODE_ENV === 'production'

const Introspection = production ? NoIntrospection : () => true
const isPretty = !production

if (!production) {
  app.get(
    '/graphiql',
    bodyParser.json(),
    graphiqlExpress(req => ({
      endpointURL: '/graphql',
      subscriptionsEndpoint: `ws://localhost:${PORT}/graphql`,
    }))
  )
  app.get('/session', sessionMiddleware)
}

const graphqlOptions = {
  schema,
  pretty: isPretty,
  validationRules: [depthLimit(10), Introspection],
  tracing: production,
  cacheControl: production,
}

app.post(
  '/graphql',
  bodyParser.json(),
  graphqlExpress(req => {
    const { session } = req
    return {
      ...graphqlOptions,
      context: { session },
    }
  })
)

const server = app.listen(PORT, () => {
  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: wsAuth,
    },
    {
      server,
      path: '/graphql',
    }
  )
})
