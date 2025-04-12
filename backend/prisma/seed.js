const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const user1 = await prisma.user.upsert({
    where: { email: 'placeholder-user1@example.com' },
    update: {},
    create: {
      clerkId: 'clerk_placeholder_1', 
      email: 'placeholder-user1@example.com',
      username: 'Alice Wonderland',
      role: 'USER',
    },
  });
  console.log(`Created/found user: ${user1.username} (ID: ${user1.id})`);

  const user2 = await prisma.user.upsert({
    where: { email: 'placeholder-user2@example.com' },
    update: {},
    create: {
      clerkId: 'clerk_placeholder_2', 
      email: 'placeholder-user2@example.com',
      username: 'Bob The Builder',
      role: 'USER',
    },
  });
  console.log(`Created/found user: ${user2.username} (ID: ${user2.id})`);

  // --- Placeholder Posts ---
  const postsData = [
    {
      title: 'Exploring the Wonders of AI Moderation',
      content: 'This post delves into how artificial intelligence is transforming content moderation. We discuss various techniques like NLP and sentiment analysis. It\'s fascinating to see how machines can help maintain safe online spaces. What are your thoughts on the ethics involved?',
      userId: user1.id, // Associate with user1
    },
    {
      title: 'A Guide to Community Building Online',
      content: 'Building a healthy online community requires more than just a platform. It needs clear guidelines, active moderation, and fostering positive interactions. This guide provides tips for community managers and platform owners. Share your best community-building tips below!',
      userId: user2.id, // Associate with user2
    },
    {
      title: 'The Future of User Reviews',
      content: 'User reviews are crucial for businesses, but fake reviews are a problem. How can AI help verify authenticity? Can sentiment analysis provide deeper insights than simple star ratings? Let\'s discuss the trends shaping the future of online reviews.',
      userId: user1.id,
    },
     {
      title: 'Dealing with Toxic Comments',
      content: 'Online toxicity can ruin platforms. This post explores strategies for handling negative comments, from automated filtering to user reporting and temporary bans. It is a difficult balance between free speech and safety. We need better tools!',
      userId: user2.id,
    },
     {
      title: 'Tips for Writing Helpful Reviews',
      content: 'Want your reviews to be genuinely useful? Be specific, provide context, describe pros and cons, and keep it concise. Avoid overly emotional language. A good review helps both the business and other consumers.',
      userId: user1.id,
    }
  ];

  for (const p of postsData) {
    const post = await prisma.post.create({
      data: p,
    });
    console.log(`Created post with id: ${post.id} - Title: ${post.title}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });