import {
  Resolver,
  Query,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
} from 'type-graphql';
import { getRepository } from 'typeorm';
import { Post } from '../entities/Post';
import { isAuth } from '../middlewares/isAuth';
import { MyContext } from '../types';

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    const dots = post.text.length > 50 ? '...' : '';
    const shortenedText = post.text.substring(0, 50);
    return shortenedText + dots;
  }

  @Query(() => [Post])
  posts(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('cursor', { nullable: true }) cursor: string
  ): Promise<Post[]> {
    const cappedLimit = Math.min(limit, 50);
    const postsQueryBuilder = getRepository(Post)
      .createQueryBuilder('posts')
      .orderBy('"createdAt"', 'DESC')
      .take(cappedLimit);

    if (cursor) {
      postsQueryBuilder.where('"createdAt" < :cursor', {
        cursor: new Date(cursor),
      });
    }

    return postsQueryBuilder.getMany();
  }

  @Query(() => Post, { nullable: true })
  post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    return Post.create({
      title: input.title,
      text: input.text,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string
  ): Promise<Post | undefined> {
    const post = await Post.findOne({ id });

    if (!post) {
      return undefined;
    }

    if (title) {
      await Post.update({ id }, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    await Post.delete({ id });
    return true;
  }
}
