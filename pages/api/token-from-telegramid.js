import { PrismaClient } from '@prisma/client';
import createAccessToken from '../../utils/jwt';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { telegramId } = req.body;
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID must be provided' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { telegramId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // const refresh = createRefreshToken(user);
      const access = createAccessToken(user);

      return res.status(200).json({ access });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
