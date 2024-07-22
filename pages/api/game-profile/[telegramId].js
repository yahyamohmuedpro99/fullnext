import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  const { telegramId } = req.query;

  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  let session;

  try {
    // Decode the token without verifying to inspect its structure
    const decoded = jwt.decode(token);
    console.log("Decoded token:", decoded);

    // Verify the token
    session = jwt.verify(token, JWT_SECRET);
    console.log("Verified session:", session);

    // Ensure session contains user and telegramId
    if (!session.user || !session.user.telegramId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: telegramId },
        include: {
          gameProfile: {
            include: {
              currentLevel: true,
              miner: true,
            },
          },
        },
      });

      if (!user || !user.gameProfile) {
        return res.status(404).json({ error: 'GameProfile not found' });
      }

      if (session.user.telegramId !== telegramId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.status(200).json(user.gameProfile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    const { points } = req.body;
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: telegramId },
        include: {
          gameProfile: true,
        },
      });

      if (!user || !user.gameProfile) {
        return res.status(404).json({ error: 'GameProfile not found' });
      }

      const gameProfile = await prisma.gameProfile.update({
        where: { id: user.gameProfile.id },
        data: { points },
        include: {
          miner: {
            select: {
              name: true,
            },
          },
          currentLevel: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              telegramId: true,
              telegramUsername: true,
            },
          },
        },
      });
      
      const simplifiedResponse = {
        id: gameProfile.id,
        points: gameProfile.points,
        minerName: gameProfile.miner.name,
        currentLevelName: gameProfile.currentLevel.name,
        user: {
          telegramId: gameProfile.user.telegramId,
          telegramUsername: gameProfile.user.telegramUsername,
        },
      };
      
      return res.status(200).json(simplifiedResponse);
      
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
