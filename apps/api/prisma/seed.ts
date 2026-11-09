import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const eventTypes = [
  {
    code: 'KICKOFF',
    category: 'match_lifecycle',
    description: 'The match or a playing period begins.',
  },
  {
    code: 'GOAL',
    category: 'scoring',
    description: 'A valid goal is scored.',
  },
  {
    code: 'OWN_GOAL',
    category: 'scoring',
    description: 'A player scores an own goal.',
  },
  {
    code: 'PENALTY_GOAL',
    category: 'scoring',
    description: 'A penalty kick results in a goal.',
  },
  {
    code: 'PENALTY_MISSED',
    category: 'scoring',
    description: 'A penalty kick is missed or saved.',
  },
  {
    code: 'YELLOW_CARD',
    category: 'disciplinary',
    description: 'A player or team official receives a yellow card.',
  },
  {
    code: 'RED_CARD',
    category: 'disciplinary',
    description: 'A player or team official receives a red card.',
  },
  {
    code: 'SECOND_YELLOW_RED',
    category: 'disciplinary',
    description: 'A second yellow card results in a red card.',
  },
  {
    code: 'SUBSTITUTION',
    category: 'lineup',
    description: 'One player is substituted for another.',
  },
  {
    code: 'HALF_TIME',
    category: 'match_lifecycle',
    description: 'The first half ends.',
  },
  {
    code: 'SECOND_HALF_STARTED',
    category: 'match_lifecycle',
    description: 'The second half begins.',
  },
  {
    code: 'VAR_REVIEW_STARTED',
    category: 'var',
    description: 'A VAR review begins.',
  },
  {
    code: 'VAR_DECISION',
    category: 'var',
    description: 'A VAR review produces a decision.',
  },
  {
    code: 'FULL_TIME',
    category: 'match_lifecycle',
    description: 'The match ends.',
  },
];

async function main() {
  for (const eventType of eventTypes) {
    await prisma.eventType.upsert({
      where: {
        code: eventType.code,
      },

      update: {
        category: eventType.category,
        description: eventType.description,
        status: 'active',
      },

      create: {
        code: eventType.code,
        category: eventType.category,
        description: eventType.description,
        status: 'active',
      },
    });
  }

  await prisma.dataProvider.upsert({
    where: { code: 'DEV_FEED' },
    update: { status: 'active' },
    create: { code: 'DEV_FEED', name: 'Development Sports Feed', status: 'active' },
  });
  console.log(`Seeded ${eventTypes.length} event types and DEV_FEED provider.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });