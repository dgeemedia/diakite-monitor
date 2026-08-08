// scripts/create-monitor-user.ts
// Creates (or updates the password for) a monitor app user.
//
// Usage:
//   pnpm create-user -- --email=jane@diakite.internal --name="Jane Doe" --password="a-long-random-password"
//
// If a user with that email already exists, this updates their password
// and name instead of failing — handy for resets.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function parseArgs() {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  const args = parseArgs();

  const email = (args.email ?? (await prompt('Email: '))).trim().toLowerCase();
  const nameInput = args.name ?? (await prompt('Name (optional): '));
  const name = nameInput || null;
  const password = args.password ?? (await prompt('Password (min 12 chars): '));

  if (!email || !email.includes('@')) {
    console.error('A valid email is required.');
    process.exit(1);
  }
  if (!password || password.length < 12) {
    console.error('Password must be at least 12 characters. Generate one with: openssl rand -base64 24');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.monitorUser.upsert({
    where: { email },
    update: { passwordHash, name, isActive: true },
    create: { email, passwordHash, name },
  });

  console.log(`\n✅ User ready: ${user.email}${user.name ? ` (${user.name})` : ''}`);
  console.log('They can now sign in at /login with this email and password.\n');
}

main()
  .catch((err) => {
    console.error('Failed to create user:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
