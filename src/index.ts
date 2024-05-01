import axios from 'axios';
import express from 'express';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { Queue } from 'queue-typescript';

import { delay } from './util';

interface InboundMessage {
  sender: string;
  recipient: string;
  body: string;
}

const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(openaiConfiguration);

const phoneNumber: string = process.env.PHONE_NUMBER as string;

const MESSAGE_HISTORY_CAP = 25;
const RESPONSE_DELAY = 6000; // in ms
const REACT_STRINGS = [
  'Laughed at',
  'Loved',
  'Liked',
  'Disliked',
  'Emphasized',
  'Questioned'
] as const;

if (!process.env.HANDLES) {
  throw Error('Missing HANDLES environment variable');
}

const HANDLES = process.env.HANDLES.split(', ');

const messageHistory: Map<
  string,
  Queue<ChatCompletionRequestMessage>
> = new Map();
const messageTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Sends iMessage text-only messages with Jared. Jared also allows you to attach things
 * but I'm too lazy to implement that
 * @param message the message to send
 * @param recipientId handle of the recipient (as determined by iMessage db)
 */
async function sendMessage(message: string, recipientId: string) {
  message = message.toLowerCase();
  const messageSet = message.split('.');
  for (const rawMessage of messageSet) {
    await delay(5000);
    if (rawMessage) {
      const message = `${rawMessage.trim()}`;
      // const message = `AI: ${rawMessage.trim()}`;
      // use API webserver to post (webhook is only for receiving)
      const response = await axios.post('http://localhost:3005/message', {
        body: { message },
        recipient: { handle: recipientId }
      });
      // console.log('Sent message data: ', response.data);
    }
  }
}

/**
 * Pings GPT API to receive response with custom parameters tuned for text messaging.
 * @param message message for GPT to respond to
 * @returns GPT response
 */

//     'davinci:ft-personal-2022-10-02-20-52-40',
async function getGptResponse(
  messageHistoryQueue: Queue<ChatCompletionRequestMessage>
) {
  const messages = messageHistoryQueue.toArray();
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          "You are N, a 20 year old college student at Duke University. Respond to these texts in the diction and phrasing of a college student (casual). Be nice and concise using texting language. I usually text like this: if someone says 'hey', i'll say 'what's up'"
      },
      ...messages
    ]
  });
  if (
    response.data.choices === undefined ||
    response.data.choices.length === 0
  ) {
    console.log('*****AI response is empty*****'); // todo probably rare
  }
  return response.data.choices[0].message; // array of strings
}

/**
 * Fetches message history associated with particular user
 * from map of message histories, or initializes a new one
 * @param sender person who sent the message
 * @returns queue of previous messages
 */
function getMessageHistory(sender: string) {
  let senderMessageHistory = messageHistory.get(sender);
  if (!senderMessageHistory) {
    senderMessageHistory = new Queue();
    messageHistory.set(sender, senderMessageHistory);
  }
  return senderMessageHistory;
}

/**
 * Prompts GPT with relevant message (especially formatting to optimize result) and
 * prints the response. Waits for rapid successive responses from same user
 * to maximize prompt quality (implemented by Scott, a consummate G 😎😎😎). Dequeues
 * from senderMessageHistory queue if it's full to reduce tokens spent on GPT.
 * @param sender person who sent the message
 */
async function handleResponseCycle(sender: string) {
  const senderMessageHistory = getMessageHistory(sender);
  const response = await getGptResponse(senderMessageHistory);
  if (!response) return;
  const text = response.content;
  senderMessageHistory.enqueue(response);

  await delay(3000);
  console.log(
    '[bold]Message history:[/bold]\n',
    Array.from(senderMessageHistory).map(
      (message) => `${message.role}: ${message.content} \n)`
    )
  );
  if (!text || text === ' ') {
    console.log('*****AI response is empty*****'); // idk if still needed
  } else {
    sendMessage(text, sender);
  }

  while (senderMessageHistory.length > MESSAGE_HISTORY_CAP) {
    senderMessageHistory.dequeue();
  }
}

/**
 * Indicates whether received message is not worth responding to (i.e.
 * a reaction, only an image, etc.)
 * @param message message to respond to
 * @returns true if message is valid prompt, false otherwise
 */
function shouldShutup(message: InboundMessage) {
  for (let i = 0; i < REACT_STRINGS.length; i++) {
    if (message.body.startsWith(REACT_STRINGS[i])) {
      console.log('Reaction detected. [italic]Skipped![/italic]');
      return true;
    }
  }
  if (message.body == '\ufffc') {
    // this line of code is a certified Scott classic 🫡
    console.log('Only image detected. [italic]Skipped![/italic]');
    return true;
  }
  return false;
}

console.log('***Building text-bot***');
sendMessage('Text bot built!', phoneNumber);

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('===== Messaging detected ======');

  if ('participants' in req.body.recipient) {
    console.log('---- Group chat detected ---- ');
    return res.send('Webhook received and ignored for group chat');
  }

  const message: InboundMessage = {
    sender: req.body.sender.handle,
    recipient: req.body.recipient.handle,
    body: req.body.body.message
  };

  if (req.body.sender.isMe) {
    console.log('---- Message from self ----');
    return res.send('Webhook received and ignored for self sent message');
  }

  if (
    HANDLES.includes(message.sender) &&
    HANDLES.includes(message.recipient) &&
    message.body.includes('AI: ')
  ) {
    console.log('---- Message from AI to self ----');
    return res.send('Webhook received and ignored for AI message to itself');
  }

  if (shouldShutup(message)) {
    return res.send("Webhook received and ignored lol (cuz it's a reaction)");
  }

  console.log('---- 1 on 1 response ----');
  console.log(req.body);
  const senderMessageHistory = getMessageHistory(message.sender);
  senderMessageHistory.enqueue({ role: 'user', content: message.body });
  // scott's very nice timing code that i don't understand yet but will soon
  const timer = messageTimers.get(message.sender);
  if (timer) {
    console.log('Clear timeout');
    clearTimeout(timer); // todo understand this
  }
  messageTimers.set(
    message.sender,
    setTimeout(() => handleResponseCycle(message.sender), RESPONSE_DELAY)
  );
  return res.send('Webhook received!');
});

console.log('***Starting server***');
// jared config webhook port
app.listen(3069);
