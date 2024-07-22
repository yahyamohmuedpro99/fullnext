// pages/api/create-user.js

import { PrismaClient } from '@prisma/client';
import { createAccessToken, createRefreshToken } from '../../utils/jwt';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const userData = req.body.userData || req.body;

    if (!userData) {
      return res.status(400).json({ error: "User data is required" });
    }

    try {
      const result = await prisma.$transaction(async (prisma) => {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { telegramId: userData.telegramId } });
        if (existingUser) {
          throw new Error("User already exists");
        }

        // Create User
        const user = await prisma.user.create({ data: userData });

        // Create GameProfile with default values
        const level = await prisma.level.findFirst({ where: { name: "Level 1" } });
        if (!level) {
          throw new Error("Default level not found");
        }

        const miner = await prisma.miner.findFirst({ where: { unlockedAt: { id: level.id } } });
        if (!miner) {
          throw new Error("Default miner not found");
        }

        const gameProfile = await prisma.gameProfile.create({
          data: {
            userId: user.id,
            currentLevelId: level.id,
            points: 0,
            minerId: miner.id,
          },
          include: {
            currentLevel: true,
            miner: { select: { name: true } },
          },
        });

        return { user, gameProfile };
      });

      const { user, gameProfile } = result;
      // const refreshToken = createRefreshToken(user);
      const accessToken = createAccessToken(user);

      res.status(201).json({ user, gameProfile, access: accessToken });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
