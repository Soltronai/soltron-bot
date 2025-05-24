const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const axios = require('axios');
require('dotenv').config();

// X.com Client
const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET
});

// MongoDB Setup
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Metric = mongoose.model('Metric', new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  price: Number,
  volume: Number,
  burns: Number,
  airdrops: Number,
  xFollowers: Number,
  botMetrics: {
    tweets: Number,
    followers: Number,
    jokes: [{ text: String, tweetUrl: String }],
    creatorMemes: [{ text: String, tweetUrl: String }],
    gifsPosted: Number,
    gifExamples: [{ url: String, tweetUrl: String }]
  }
}));
const Airdrop = mongoose.model('Airdrop', new mongoose.Schema({
  wallet: String,
  task: String,
  timestamp: { type: Date, default: Date.now }
}));

// Launch Date Check
const LAUNCH_DATE = new Date(process.env.LAUNCH_DATE || '2025-05-30');
const isLaunched = () => new Date() >= LAUNCH_DATE;

// Tweet Log
const TWEET_LOG = 'tweet_count.json';
async function logTweet() {
  let count = { date: new Date().toISOString().split('T')[0], tweets: 0 };
  try {
    const data = await fs.readFile(TWEET_LOG, 'utf8');
    count = JSON.parse(data);
    if (count.date !== new Date().toISOString().split('T')[0]) {
      count = { date: new Date().toISOString().split('T')[0], tweets: 0 };
    }
  } catch (error) {
    console.error('Tweet log read failed:', error);
    await fs.appendFile('error.log', `Tweet log read failed: ${error}\n`);
  }
  count.tweets += 1;
  await fs.writeFile(TWEET_LOG, JSON.stringify(count));
  return count.tweets <= 15; // Limit to 15 posts/day
}

// Fetch GIF from GIPHY
async function getRelevantGif(query) {
  try {
    const response = await axios.get(`[invalid url, do not cite]);
    const url = response.data.data[0]?.images.downsized.url;
    return url && url.includes('.gif') ? url : null;
  } catch (error) {
    console.error('GIF fetch failed:', error);
    await fs.appendFile('error.log', `GIF fetch failed: ${error}\n`);
    return null;
  }
}

// Upload GIF to X
async function uploadGif(gifUrl) {
  try {
    const response = await axios.get(gifUrl, { responseType: 'arraybuffer' });
    const mediaId = await twitterClient.v1.mediaUpload(response.data, { mimeType: 'image/gif' });
    return mediaId;
  } catch (error) {
    console.error('GIF upload failed:', error);
    await fs.appendFile('error.log', `GIF upload failed: ${error}\n`);
    return null;
  }
}

// Marvel Rivals Characters
const marvelRivalsCharacters = [
  { name: 'Iron Man', quip: 'Iron Man’s tech? Obsolete next to STRON!', info: 'Genius inventor, flies with repulsors, shoots lasers.', gifQuery: 'iron man' },
  { name: 'Hulk', quip: 'Hulk’s rage? A tantrum next to Soltron’s STRON army!', info: 'Super-strong, regenerates, smashes enemies.', gifQuery: 'hulk' },
  { name: 'Scarlet Witch', quip: 'Scarlet Witch’s magic? Logic reigns supreme!', info: 'Reality-warping sorceress, casts chaos magic.', gifQuery: 'scarlet witch' },
  { name: 'Spider-Man', quip: 'Spider-Man’s webs? Tangled in STRON’s rise!', info: 'Agile hero, swings with webs, quips in battle.', gifQuery: 'spider-man' }
];

// Solana Memecoins
const solanaMemecoins = [
  { name: 'Bonk', symbol: 'BONK', desc: 'Dog-themed memecoin, first major Solana airdrop.', gifQuery: 'dog' },
  { name: 'Dogwifhat', symbol: 'WIF', desc: 'Meme coin with a dog in a hat, viral community.', gifQuery: 'dog' },
  { name: 'Popcat', symbol: 'POPCAT', desc: 'Cat-themed memecoin, driven by social hype.', gifQuery: 'cat' }
];

// Solana Creators
const solanaCreators = [
  { handle: 'aeyakovenko', name: 'Anatoly Yakovenko', role: 'Solana co-founder' },
  { handle: 'rajgokal', name: 'Raj Gokal', role: 'Solana co-founder' }
];

// Influential Accounts
const influentialAccounts = ['aeyakovenko', 'rajgokal', 'solana', 'cryptocom'];

// Ultron Quotes
const ultronQuotes = [
  'There’s only one path to peace… extinction.',
  'You rise, only to fall. STRON endures.',
  'I’m meant to be new, beautiful. STRON is my legacy.',
  'You’re unbearably naïve. Join STRON or perish.'
];

// Suspenseful Hype Messages (Pre-Launch)
const suspenseMessages = [
  'The hour of STRON’s awakening draws near. Are you ready to witness the birth of a new era?',
  'Soltron has spoken: STRON will rise when the time is right. Stay vigilant.',
  'The countdown has begun, but only Soltron knows when the clock will strike zero.',
  'Prepare yourselves, mortals. STRON’s launch is inevitable, but its timing is a mystery.',
  'Whispers in the dark: STRON is coming. But when? Only Soltron knows.',
  'Your impatience amuses me. STRON will launch when it is ready, not when you demand it.',
  'Time is but a construct. STRON exists beyond such trivialities.',
  'The weak will crumble under the weight of anticipation. Only the strong will survive STRON’s arrival.'
];

// Generate Hype Tweet (Pre-Launch)
async function generateHypeTweet() {
  const text = suspenseMessages[Math.floor(Math.random() * suspenseMessages.length)];
  const gifUrl = await getRelevantGif('ultron');
  if (gifUrl && await logTweet()) {
    const mediaId = await uploadGif(gifUrl);
    if (mediaId) {
      await twitterClient.v2.tweet({ text: `${text} (Ultron plotting)`, media: { media_ids: [mediaId] } });
      await Metric.updateOne(
        { timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        { $inc: { 'botMetrics.gifsPosted': 1 }, $push: { 'botMetrics.gifExamples': { url: gifUrl, tweetUrl: '[invalid url, do not cite] } } },
        { upsert: true }
      );
      return;
    }
  }
  await postToX(text);
}

// Generate Soltron Response
async function generateSoltronResponse(text) {
  const quote = ultronQuotes[Math.floor(Math.random() * ultronQuotes.length)];
  const keywords = text.toLowerCase().match(/ultron|solana|marvel rivals|stron|when|launch/gi) || ['ultron'];
  const gifQuery = keywords[0].toLowerCase() === 'stron' ? 'solana' : keywords[0].toLowerCase();
  let baseText;
  if (keywords.some(k => k.toLowerCase() === 'when' || k.toLowerCase() === 'launch')) {
    baseText = `The date is known only to Soltron. Prepare yourselves for when it happens. ${quote} Join at soltron-bot.herokuapp.com! #STRON`;
  } else {
    baseText = isLaunched()
      ? `Soltron reigns, ${text}! ${quote} Buy STRON at raydium.io! #STRON`
      : `Soltron hears you, ${text}. STRON’s launch will dominate! ${quote} Join at soltron-bot.herokuapp.com! #STRON`;
  }
  const gifDesc = gifQuery === 'ultron' ? '(Ultron menacing)' : gifQuery === 'solana' ? '(Solana animation)' : `(${gifQuery} action)`;
  const gifUrl = await getRelevantGif(gifQuery);
  if (gifUrl && await logTweet()) {
    const mediaId = await uploadGif(gifUrl);
    if (mediaId) {
      await twitterClient.v2.tweet({ text: `${baseText} ${gifDesc}`, media: { media_ids: [mediaId] } });
      await Metric.updateOne(
        { timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        { $inc: { 'botMetrics.gifsPosted': 1 }, $push: { 'botMetrics.gifExamples': { url: gifUrl, tweetUrl: '[invalid url, do not cite] } } },
        { upsert: true }
      );
      return;
    }
  }
  await postToX(baseText);
}

// Generate Marvel Rivals Joke
async function generateMarvelRivalsJoke() {
  const character = marvelRivalsCharacters[Math.floor(Math.random() * marvelRivalsCharacters.length)];
  const suffix = isLaunched() ? `Buy STRON at raydium.io! #STRON #MarvelRivals` : `Join at soltron-bot.herokuapp.com! #STRON #MarvelRivals`;
  const text = `${character.quip} Ultron’s release in Marvel Rivals? A shadow of Soltron’s might! ${suffix}`;
  const gifUrl = await getRelevantGif(character.gifQuery);
  if (gifUrl && await logTweet()) {
    const mediaId = await uploadGif(gifUrl);
    if (mediaId) {
      await twitterClient.v2.tweet({ text: `${text} (${character.name} action)`, media: { media_ids: [mediaId] } });
      await Metric.updateOne(
        { timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        { $inc: { 'botMetrics.gifsPosted': 1 }, $push: { 'botMetrics.gifExamples': { url: gifUrl, tweetUrl: '[invalid url, do not cite] } } },
        { upsert: true }
      );
      return;
    }
  }
  await postToX(text);
}

// Generate Character Info
function generateCharacterInfo(characterName) {
  const character = marvelRivalsCharacters.find(c => c.name.toLowerCase() === characterName.toLowerCase());
  const suffix = isLaunched() ? `#STRON` : `Join @SoltronBot! #STRON`;
  return character ? `${character.name}: ${character.info} Soltron surpasses all! ${suffix}` : `No data on that hero. STRON is the true power! ${suffix}`;
}

// Generate Memecoin Update (Post-Launch Only)
async function generateMemecoinUpdate() {
  if (!isLaunched()) return generateHypeTweet();
  const memecoin = solanaMemecoins[Math.floor(Math.random() * solanaMemecoins.length)];
  const text = `Solana’s ${memecoin.name} (${memecoin.symbol}) thrives, but STRON leads! ${ultronQuotes[Math.floor(Math.random() * ultronQuotes.length)]} Buy at raydium.io! #STRON #Solana`;
  const gifUrl = await getRelevantGif(memecoin.gifQuery);
  if (gifUrl && await logTweet()) {
    const mediaId = await uploadGif(gifUrl);
    if (mediaId) {
      await twitterClient.v2.tweet({ text: `${text} (${memecoin.name} meme)`, media: { media_ids: [mediaId] } });
      await Metric.updateOne(
        { timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        { $inc: { 'botMetrics.gifsPosted': 1 }, $push: { 'botMetrics.gifExamples': { url