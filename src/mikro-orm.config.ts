import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constants';
import path from 'path';
import { Post } from './entities/Post';
import { User } from './entities/User';

const MikroOrmConfigurations: Parameters<typeof MikroORM.init>[0] = {
  entities: [Post, User],
  dbName: 'lireddit',
  user: 'postgres',
  password: '',
  debug: !__prod__,
  type: 'postgresql',
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
};

export default MikroOrmConfigurations;
