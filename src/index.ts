import axios from 'axios';
import express from 'express';
import { Configuration, OpenAIApi } from 'openai';
import { Queue } from 'queue-typescript';

interface Message {
  sender: string;
  recipient: string;
  body: string;
}

const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(openaiConfiguration);

const MESSAGE_HISTORY_CAP = 25;
const RESPONSE_DELAY = 10000;
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

const messageHistory: Map<string, Queue<string>> = new Map();
const messageTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Sends iMessage text-only messages with Jared. Jared also allows you to attach things
 * but I'm too lazy to implement that
 * @param message the message to send
 * @param recipientId handle of the recipient (as determined by iMessage db)
 */
async function sendMessage(message: string, recipientId: string) {
  const messageSet = message.split('.');
  for (const rawMessage of messageSet) {
    if (rawMessage) {
      const message = `AI: ${rawMessage}`;
      const response = await axios.post('http://localhost:3000/message', {
        body: { message },
        recipient: { handle: recipientId }
      });
      console.log(response.data);
    }
  }
}

/**
 * Pings GPT API to receive response with custom parameters tuned for text messaging.
 * @param message message for GPT to respond to
 * @returns GPT response
 */
async function getGptResponse(message: string) {
  const response = await openai.createCompletion('text-davinci-002', {
    prompt: message,
    stop: 'You:',
    temperature: 0.5,
    max_tokens: 200,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0
  });
  return response.data.choices?.[0].text ?? '';
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
  const promptString = `${Array.from(senderMessageHistory).join('\n')}\nYou:`;
  const response = (await getGptResponse(promptString)).trim();
  senderMessageHistory.enqueue(`You: ${response}`);
  console.log(
    '[bold]Message history:[/bold]\n',
    Array.from(senderMessageHistory).join('\n')
  );
  if (!response || response === ' ') {
    console.log('*****AI response is empty*****');
  } else {
    sendMessage(response, sender);
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
function shouldShutup(message: Message) {
  for (const item in REACT_STRINGS) {
    if (message.body.startsWith(item)) {
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

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('===== Messaging detected ======');

  if ('participants' in req.body.recipient) {
    console.log('---- Group chat detected ---- ');
    return res.send('Webhook received and ignored for group chat');
  }

  const message: Message = {
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
  senderMessageHistory.enqueue(`Me: ${message.body}`);
  const timer = messageTimers.get(message.sender);
  if (timer) {
    console.log('Clear timeout');
    clearTimeout(timer);
  }
  messageTimers.set(
    message.sender,
    setTimeout(() => handleResponseCycle(message.sender), RESPONSE_DELAY)
  );
  return res.send('Webhook received!');
});

app.listen(3001);
