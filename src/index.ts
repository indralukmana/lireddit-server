import { MikroORM } from '@mikro-orm/core';
import { __prod__ } from './constants';
import { Post } from './entities/Post';
import MikroOrmConfigurations from './mikro-orm.config';

const main = async () => {
  const orm = await MikroORM.init(MikroOrmConfigurations);
  await orm.getMigrator().up();
  const post = orm.em.create(Post, { title: '1' });
  await orm.em.persistAndFlush(post);
  console.log('======= SQL =======');
  const posts = await orm.em.find(Post, {});
  console.log(posts);
};

try {
  main();
} catch (error) {
  console.log(error);
}
