import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export const createAccessToken = (user) => {
  return jwt.sign({ user }, SECRET, { expiresIn: '360d' });
};

// export const createRefreshToken = (user) => {
//   return jwt.sign({ user }, SECRET, { expiresIn: '365d' });
// };
