import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import argon2 from 'argon2';
import { FORGOT_PASSWORD_PREFIX, SESSION_COOKIE_NAME } from '../constants';
import { validateUserRegistration } from '../utils/validateUser';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { v4 } from 'uuid';
import { sendEmail } from '../utils/sendEmail';

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('newPassword') newPassword: string,
    @Arg('token') token: string,
    @Ctx() { em, req, redis }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 3) {
      const errors = [
        {
          field: 'password',
          message: 'password cannot be less than 3 chars',
        },
      ];

      return { errors };
    }

    const forgotPasswordKey = FORGOT_PASSWORD_PREFIX + token;

    const userId = await redis.get(forgotPasswordKey);

    if (!userId) {
      const errors = [
        {
          field: 'token',
          message: 'token expired',
        },
      ];

      return { errors };
    }

    const user = await em.findOne(User, { id: Number(userId) });

    if (!user) {
      const errors = [
        {
          field: 'token',
          message: 'user does not exist',
        },
      ];

      return { errors };
    }

    user.password = await argon2.hash(newPassword);

    await em.persistAndFlush(user);
    await redis.del(forgotPasswordKey);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });

    if (!user) {
      // return nothing when no account related to email for security
      return true;
    }

    const token = v4();

    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60 * 24 * 3
    );

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateUserRegistration(options);

    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === '23505') {
        return {
          errors: [{ field: 'username', message: 'username already exist' }],
        };
      }
      console.log(error);
    }

    req.session.userId = user.id;

    return { user };
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes('@')
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: `no user with ${usernameOrEmail} credential`,
          },
        ],
      };
    }

    const validPassword = await argon2.verify(user.password, password);

    if (!validPassword) {
      return {
        errors: [{ field: 'password', message: 'incorrect password' }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(SESSION_COOKIE_NAME);
        if (err) {
          console.log({ err });
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
