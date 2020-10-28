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
  ObjectType,
} from 'type-graphql';
import { getConnection, getRepository } from 'typeorm';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { isAuth } from '../middlewares/isAuth';
import { MyContext } from '../types';

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    const dots = post.text.length > 50 ? '...' : '';
    const shortenedText = post.text.substring(0, 50);
    return shortenedText + dots;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId') postId: number,
    // @Arg('value') value: number,
    @Ctx() { req }: MyContext
  ) {
    const post = await getRepository(Post).findOne({
      relations: ['voters'],
      where: { id: postId },
    });

    if (!post) {
      return false;
    }

    const user = await User.findOne(req.session.userId);

    if (!user) {
      return false;
    }

    const voters = post.voters;
    const alreadyVoted = voters.find((voter) => voter.id === user.id);

    if (!alreadyVoted) {
      post.voters = [user];
      post.points += 1;
    } else {
      post.voters = post.voters.filter((voter) => voter.id !== user.id);
      post.points -= 1;
    }

    await post.save();

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 })
    limit: number,
    @Arg('cursor', { nullable: true }) cursor: string
  ): Promise<PaginatedPosts> {
    const cappedLimit = Math.min(limit, 50);
    const cappedLimitPlusOne = cappedLimit + 1;

    const replacements = [cappedLimitPlusOne] as any[];

    if (cursor) {
      replacements.push(new Date(cursor));
    }

    const posts = await getConnection().query(
      `
      select p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
      ) creator
      from public.post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? 'where p."createdAt" < $2' : ''}
      order by p."createdAt" DESC
      limit $1
    `,
      replacements
    );

    return {
      posts: posts.slice(0, cappedLimit),
      hasMore: posts.length === cappedLimitPlusOne,
    };
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
