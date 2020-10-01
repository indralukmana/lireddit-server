import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constants';
import { Post } from './entities/Post';
import path from 'path';

const MikroOrmConfigurations: Parameters<typeof MikroORM.init>[0] = {
  entities: [Post],
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
