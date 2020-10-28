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
import { getRepository } from 'typeorm';
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

  @FieldResolver(() => Boolean)
  userVoted(@Root() post: Post, @Ctx() { req }: MyContext) {
    const userVoted = post.voters.find(
      (voter) => voter.id === req.session.userId
    );
    return !!userVoted;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(@Arg('postId') postId: number, @Ctx() { req }: MyContext) {
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

    const p = await getRepository(Post)
      .createQueryBuilder('posts')
      .leftJoinAndSelect('posts.voters', 'voters')
      .leftJoinAndSelect('posts.creator', 'creator')
      .take(cappedLimitPlusOne)
      .getMany();

    return {
      posts: p.slice(0, cappedLimit),
      hasMore: p.length === cappedLimitPlusOne,
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
