import { MikroORM } from '@mikro-orm/core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildSchema } from 'type-graphql';

import { __prod__ } from './constants';
import { Post } from './entities/Post';
import MikroOrmConfigurations from './mikro-orm.config';
import { HelloResolver } from './resolvers/hello';

const main = async () => {
  const orm = await MikroORM.init(MikroOrmConfigurations);
  await orm.getMigrator().up();

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver],
      validate: false,
    }),
  });

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log('Server started at port 4000');
  });
};

try {
  main();
} catch (error) {
  console.log(error);
}
