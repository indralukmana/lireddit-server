import { UsernamePasswordInput } from 'src/resolvers/UsernamePasswordInput';

export const validateUserRegistration = (options: UsernamePasswordInput) => {
  if (options.username.length < 3) {
    return [
      {
        field: 'username',
        message: 'username cannot be less than 3 chars',
      },
    ];
  }

  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'email is invalid',
      },
    ];
  }

  if (options.password.length < 3) {
    return [
      {
        field: 'password',
        message: 'password cannot be less than 3 chars',
      },
    ];
  }

  return null;
};
